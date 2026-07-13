import {
  Listener,
  SUBJECTS,
  type PaymentClearedEvent,
} from "@venuepass/common";
import { OrderStatus } from "@venuepass/common/client";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";
import { OrderCompletedPublisher } from "../publishers/order-completed-publisher";
import { PaymentRefundPublisher } from "../publishers/payment-refund-publisher";

export class PaymentClearedListener extends Listener<PaymentClearedEvent> {
  readonly subject = SUBJECTS.PaymentCleared;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "orders-service-payment-cleared",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(
    data: PaymentClearedEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    const orderId = data.orderId;
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Handle CANCELLED orders - publish refund for late PaymentCleared events
    // This handles the case where payment succeeded via Stripe but we receive
    // PaymentCleared after the order was cancelled (e.g., due to expiry)
    if (order.status === OrderStatus.CANCELLED) {
      console.debug(
        `PaymentClearedListener publishing refund for cancelled order ${orderId}`,
      );
      await new PaymentRefundPublisher(this.client).publish({
        orderId: order.id,
        stripeId: data.stripeId,
      });
      msg.ack();
      return;
    }

    // Skip processing for COMPLETED orders (already finalized), unless the
    // OrderCompleted event was never confirmed published — e.g. the process
    // crashed or publish() threw after order.save() but before ack(). In
    // that case the DB already reflects COMPLETED, but the rest of the
    // saga never heard about it, so we must republish rather than skip.
    if (order.status === OrderStatus.COMPLETED) {
      if (!order.completedEventSent) {
        await new OrderCompletedPublisher(this.client).publish({
          id: order.id,
          version: order.version,
          status: order.status,
        });
        order.set({ completedEventSent: true });
        await order.save();
      }
      msg.ack();
      return;
    }

    await order.populate("ticket");

    // If the ticket was reassigned to another buyer before this listener ran,
    // skip completion to prevent a double-sale. This handles the race condition
    // where an order expires and gets cancelled while a payment is in flight.
    // By checking if the ticket's orderId changed, we detect if it was sold to someone else.
    if (order.ticket.orderId !== order.id) {
      console.debug(
        `PaymentClearedListener skipping completion for ${orderId}: ticket already reassigned from this order`,
      );
      await new PaymentRefundPublisher(this.client).publish({
        orderId: order.id,
        stripeId: data.stripeId,
      });
      msg.ack();
      return;
    }

    order.set({ status: OrderStatus.COMPLETED });
    await order.save();
    await new OrderCompletedPublisher(this.client).publish({
      id: order.id,
      version: order.version,
      status: order.status,
    });
    await Order.updateOne(
      { _id: order.id },
      { $set: { completedEventSent: true } },
    );
    msg.ack();
  }
}

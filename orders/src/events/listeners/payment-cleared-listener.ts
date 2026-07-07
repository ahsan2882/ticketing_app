import {
  Listener,
  OrderStatus,
  SUBJECTS,
  type PaymentClearedEvent,
} from "@venuepass/common";
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

    // Skip processing if the order is already in a terminal state
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.COMPLETED
    ) {
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
    msg.ack();
  }
}

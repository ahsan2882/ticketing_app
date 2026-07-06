import {
  Listener,
  OrderStatus,
  SUBJECTS,
  type PaymentClearedEvent,
} from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";
import { OrderCompletedPublisher } from "../publishers/order-completed-publisher";

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
    if (order.status === OrderStatus.COMPLETED) {
      msg.ack();
      return;
    }

    await order.populate("ticket");
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

import {
  Listener,
  type OrderCompletedEvent,
  OrderStatus,
  SUBJECTS,
} from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";

export class OrderCompletedListener extends Listener<OrderCompletedEvent> {
  readonly subject = SUBJECTS.OrderCompleted;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "payments-service-order-completed",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(
    data: OrderCompletedEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    const order = await Order.findById(data.id);
    if (!order) throw new Error("Order not found");
    if (order.status === OrderStatus.COMPLETED) {
      console.log("Order already marked as completed");
      msg.ack();
      return;
    }
    order.set({ status: OrderStatus.COMPLETED });
    await order.save();
    msg.ack();
  }
}

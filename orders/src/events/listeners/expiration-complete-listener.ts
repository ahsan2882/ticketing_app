import {
  Listener,
  OrderStatus,
  SUBJECTS,
  type ExpirationCompleteEvent,
} from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";
import { OrderCancelledPublisher } from "../publishers/order-cancelled-publisher";

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
  readonly subject = SUBJECTS.ExpirationComplete;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "orders-service-expiration-complete",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(
    data: ExpirationCompleteEvent["data"],
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
    order.set({ status: OrderStatus.CANCELLED });
    await order.save();
    await new OrderCancelledPublisher(this.client).publish({
      id: orderId,
      version: order.version,
      ticket: { id: order.ticket.id },
      status: OrderStatus.CANCELLED,
    });
    msg.ack();
  }
}

import {
  Listener,
  SUBJECTS,
  type OrderCancelledEvent,
} from "@venuepass/common";
import { OrderStatus } from "@venuepass/common/client";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  readonly subject = SUBJECTS.OrderCancelled;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "payments-service-order-cancelled",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(
    data: OrderCancelledEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    const orderId = data.id;
    const order = await Order.findOneAndUpdate(
      { _id: orderId, version: data.version - 1 },
      {
        $set: { status: OrderStatus.CANCELLED },
        $inc: { version: 1 },
      },
      { returnDocument: "after" },
    );
    if (!order) {
      const existing = await Order.findById(orderId);
      if (!existing) {
        throw new Error("Order not found");
      }
      if (existing.version >= data.version) {
        // genuinely stale/duplicate — safe no-op
        console.log(
          `OrderCancelledListener no-op: order ${orderId} already at version ${existing.version}`,
        );
        msg.ack();
        return;
      }
      // existing.version < data.version - 1: event arrived out of order, not yet caught up
      throw new Error(
        `OrderCancelledListener: order ${orderId} at version ${existing.version}, expected ${data.version - 1}; retrying`,
      );
    }
    msg.ack();
  }
}

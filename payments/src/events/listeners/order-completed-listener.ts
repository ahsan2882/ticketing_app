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
    const order = await Order.findOneAndUpdate(
      { _id: data.id, version: data.version - 1 },
      {
        $set: { status: OrderStatus.COMPLETED },
        $inc: { version: 1 },
      },
      { returnDocument: "after" },
    );

    if (!order) {
      const existing = await Order.findById(data.id);
      if (!existing) {
        throw new Error("Order not found");
      }
      if (existing.version >= data.version) {
        console.log(
          `OrderCompletedListener no-op: order ${data.id} already at version ${existing.version}`,
        );
        msg.ack();
        return;
      }
      throw new Error(
        `OrderCompletedListener: order ${data.id} at version ${existing.version}, expected ${data.version - 1}; retrying`,
      );
    }

    msg.ack();
  }
}

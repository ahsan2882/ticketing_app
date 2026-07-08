import {
  Listener,
  type OrderAwaitingPaymentEvent,
  OrderStatus,
  SUBJECTS,
} from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";

export class OrderAwaitingPaymentListener extends Listener<OrderAwaitingPaymentEvent> {
  readonly subject = SUBJECTS.OrderAwaitingPayment;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "payments-service-order-awaiting-payment",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(
    data: OrderAwaitingPaymentEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    const order = await Order.findOneAndUpdate(
      { _id: data.id, version: data.version - 1 },
      {
        $set: { status: OrderStatus.AWAITING_PAYMENT },
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
        console.warn(
          `OrderAwaitingPaymentListener no-op: order ${data.id} already at version ${existing.version}`,
        );
        msg.ack();
        return;
      }
      throw new Error(
        `OrderAwaitingPaymentListener: order ${data.id} at version ${existing.version}, expected ${data.version - 1}; retrying`,
      );
    }
    msg.ack();
  }
}

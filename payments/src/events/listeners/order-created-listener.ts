import { Listener, type OrderCreatedEvent, SUBJECTS } from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  readonly subject = SUBJECTS.OrderCreated;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "payments-service-order-created",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(data: OrderCreatedEvent["data"], msg: JsMsg): Promise<void> {
    const order = Order.build({
      id: data.id,
      price: data.ticket.price,
      status: data.status,
      userId: data.userId,
    });
    await order.save();
    msg.ack();
  }
}

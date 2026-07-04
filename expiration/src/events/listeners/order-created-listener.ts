import { Listener, SUBJECTS, type OrderCreatedEvent } from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { getExpirationQueue } from "../../queues/expiration-queue";

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  readonly subject = SUBJECTS.OrderCreated;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "expiration-service-order-created",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(data: OrderCreatedEvent["data"], msg: JsMsg): Promise<void> {
    const expiresAt = new Date(data.expiresAt).getTime();
    const now = new Date().getTime();
    // Compute delay, clamping to zero for already-expired orders
    const delay = Math.max(0, expiresAt - now);
    const expirationQueue = getExpirationQueue();
    await expirationQueue.add(
      {
        orderId: data.id,
      },
      { delay },
    );

    msg.ack();
  }
}

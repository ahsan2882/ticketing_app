import { Publisher, SUBJECTS, type OrderCreatedEvent } from "@venuepass/common";
import type { NatsConnection } from "nats";

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  readonly subject = SUBJECTS.OrderCreated;
  constructor(client: NatsConnection) {
    super(client);
  }
}

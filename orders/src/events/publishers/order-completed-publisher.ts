import {
  Publisher,
  SUBJECTS,
  type OrderCompletedEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class OrderCompletedPublisher extends Publisher<OrderCompletedEvent> {
  readonly subject = SUBJECTS.OrderCompleted;
  constructor(client: NatsConnection) {
    super(client);
  }
}

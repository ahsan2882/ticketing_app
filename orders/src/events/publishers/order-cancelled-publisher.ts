import {
  Publisher,
  SUBJECTS,
  type OrderCancelledEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
  readonly subject = SUBJECTS.OrderCancelled;
  constructor(client: NatsConnection) {
    super(client);
  }
}

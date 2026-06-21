import {
  Publisher,
  SUBJECTS,
  type TicketUpdatedEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
  readonly subject = SUBJECTS.TicketUpdated;
  constructor(client: NatsConnection) {
    super(client);
  }
}

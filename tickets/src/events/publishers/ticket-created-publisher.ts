import {
  Publisher,
  SUBJECTS,
  type TicketCreatedEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;
  constructor(client: NatsConnection) {
    super(client);
  }
}

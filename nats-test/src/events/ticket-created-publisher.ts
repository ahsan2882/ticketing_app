import type { NatsConnection } from "nats";
import { SUBJECTS, type TicketCreatedEvent } from "../events/events";
import { Publisher } from "./base-publisher";

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;

  constructor(client: NatsConnection) {
    super(client);
  }
}

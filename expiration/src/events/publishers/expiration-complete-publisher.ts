import {
  Publisher,
  SUBJECTS,
  type ExpirationCompleteEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  readonly subject = SUBJECTS.ExpirationComplete;
  constructor(client: NatsConnection) {
    super(client);
  }
}

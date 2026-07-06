import {
  Publisher,
  SUBJECTS,
  type PaymentClearedEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class PaymentClearedPublisher extends Publisher<PaymentClearedEvent> {
  readonly subject = SUBJECTS.PaymentCleared;
  constructor(client: NatsConnection) {
    super(client);
  }
}

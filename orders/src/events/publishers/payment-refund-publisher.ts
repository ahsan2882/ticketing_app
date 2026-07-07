import {
  Publisher,
  SUBJECTS,
  type PaymentRefundEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class PaymentRefundPublisher extends Publisher<PaymentRefundEvent> {
  readonly subject = SUBJECTS.PaymentRefund;
  constructor(client: NatsConnection) {
    super(client);
  }
}

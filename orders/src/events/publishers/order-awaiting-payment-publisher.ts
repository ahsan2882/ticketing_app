import {
  Publisher,
  SUBJECTS,
  type OrderAwaitingPaymentEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

export class OrderAwaitingPaymentPublisher extends Publisher<OrderAwaitingPaymentEvent> {
  readonly subject = SUBJECTS.OrderAwaitingPayment;
  constructor(client: NatsConnection) {
    super(client);
  }
}

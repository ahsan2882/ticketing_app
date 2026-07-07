import { Listener, SUBJECTS, type PaymentRefundEvent } from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { stripe } from "../../stripe";

export class PaymentRefundListener extends Listener<PaymentRefundEvent> {
  readonly subject = SUBJECTS.PaymentRefund;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "payments-service-payment-refund",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(data: PaymentRefundEvent["data"], msg: JsMsg): Promise<void> {
    console.log("Initiating refund", data);
    await stripe.refunds.create({ payment_intent: data.stripeId });
    msg.ack();
  }
}

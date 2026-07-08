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
    try {
      // Use an idempotency key to prevent duplicate refunds
      const idempotencyKey = `refund-payment-${data.stripeId}`;
      await stripe.refunds.create({
        payment_intent: data.stripeId,
        idempotency_key: idempotencyKey,
      });
    } catch (error: any) {
      // Handle duplicate refund attempts gracefully
      // If the charge is already refunded, ack the message anyway
      if (
        error?.type === "card_error" &&
        error.raw?.message?.includes("charge_already_refunded")
      ) {
        console.log("Refund already processed for payment", data.stripeId);
        msg.ack();
        return;
      }
      throw error;
    }
    msg.ack();
  }
}

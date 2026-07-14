import { SUBJECTS } from "@venuepass/common";
import type { JsMsg } from "nats";
import { natsClient } from "../../../nats-client";
import { stripe } from "../../../stripe";
import { PaymentRefundListener } from "../payment-refund-listener";

const setup = () => {
  const listener = new PaymentRefundListener(natsClient.client);
  const data = {
    orderId: "order_123",
    stripeId: "pi_refund_123",
  } as any;
  const msg = {
    ack: jest.fn(),
  } as unknown as JsMsg;

  return { listener, data, msg };
};

describe("PaymentRefundListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (stripe.refunds.create as jest.Mock).mockResolvedValue({
      id: "ref_123",
      object: "refund",
    });
  });

  it("uses the expected subject and default durable name", () => {
    const { listener } = setup();

    expect(listener.subject).toEqual(SUBJECTS.PaymentRefund);
    expect(listener.durableName).toEqual("payments-service-payment-refund");
  });

  it("accepts a custom durable name", () => {
    const listener = new PaymentRefundListener(
      natsClient.client,
      "custom-refund-listener",
    );

    expect(listener.durableName).toEqual("custom-refund-listener");
  });

  it("creates a Stripe refund with a deterministic idempotency key", async () => {
    const { listener, data, msg } = setup();

    await listener.onMessage(data, msg);

    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: data.stripeId },
      { idempotencyKey: `refund-payment-${data.stripeId}` },
    );
  });

  it("acks after Stripe accepts the refund", async () => {
    const { listener, data, msg } = setup();

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it("acks when Stripe reports that the charge was already refunded", async () => {
    const { listener, data, msg } = setup();
    (stripe.refunds.create as jest.Mock).mockRejectedValueOnce({
      type: "invalid_request_error",
      code: "charge_already_refunded",
    });

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      type: "api_error",
      code: "charge_already_refunded",
      message: "wrong error type",
    },
    {
      type: "invalid_request_error",
      code: "some_other_code",
      message: "wrong error code",
    },
  ])("rethrows non-idempotent Stripe errors: $message", async (error) => {
    const { listener, data, msg } = setup();
    (stripe.refunds.create as jest.Mock).mockRejectedValueOnce(error);

    await expect(listener.onMessage(data, msg)).rejects.toBe(error);
    expect(msg.ack).not.toHaveBeenCalled();
  });
});

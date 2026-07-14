import { OrderStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { PaymentClearedPublisher } from "../../events/publishers/payment-cleared-publisher";
import { Order } from "../../models/order.model";
import { Payment } from "../../models/payment.model";
import { natsClient } from "../../nats-client";
import { stripe } from "../../stripe";

jest.mock("../../events/publishers/payment-cleared-publisher");

const buildCancelledOrderEvent = (
  orderId: string,
  paymentIntentId = "pi_mock_123",
) => ({
  id: "evt_mock_3",
  type: "payment_intent.succeeded",
  data: {
    object: {
      id: paymentIntentId,
      metadata: { orderId },
    },
  },
});

const createOrder = async (
  userId: string,
  overrides?: Partial<{ status: OrderStatus; price: number }>,
) => {
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    status: OrderStatus.AWAITING_PAYMENT,
    price: 99.99,
    ...overrides,
  });
  await order.save();
  return order;
};

const buildSucceededEvent = (
  orderId: string,
  paymentIntentId = "pi_mock_123",
) => ({
  id: "evt_mock_1",
  type: "payment_intent.succeeded",
  data: {
    object: {
      id: paymentIntentId,
      metadata: { orderId },
    },
  },
});

const sendWebhook = (
  payload: unknown,
  signature = "irrelevant-because-mocked",
) =>
  request(app)
    .post("/api/payments/webhook")
    .set("stripe-signature", signature)
    .send(Buffer.from(JSON.stringify(payload)));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("stripe webhook — signature handling", () => {
  it("returns 400 when the stripe-signature header is missing", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments/webhook")
      .send(Buffer.from(JSON.stringify(buildSucceededEvent(order.id))))
      .expect(400);

    expect(stripe.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when constructEvent throws (invalid signature)", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => {
      throw new Error("invalid signature");
    });

    await sendWebhook({ irrelevant: true }, "bad-sig").expect(400);
  });
});

describe("stripe webhook — irrelevant event types", () => {
  it("returns 200 and does nothing when the event type is not payment_intent.succeeded", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
      id: "evt_mock_2",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_mock_failed", metadata: {} } },
    });

    const paymentCountBefore = await Payment.countDocuments();

    await sendWebhook({ irrelevant: true }).expect(200);

    expect(await Payment.countDocuments()).toEqual(paymentCountBefore);
    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("stripe webhook — order lookup", () => {
  it("returns 404 when no order matches the metadata.orderId", async () => {
    const fakeOrderId = new mongoose.Types.ObjectId().toHexString();

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(fakeOrderId),
    );

    await sendWebhook({ irrelevant: true }).expect(404);

    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("stripe webhook — successful payment", () => {
  it("creates a Payment record linking the order and the Stripe payment intent", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_abc_999"),
    );

    await sendWebhook({ irrelevant: true }).expect(200);

    const payment = await Payment.findOne({ orderId: order.id });
    expect(payment).not.toBeNull();
    expect(payment!.stripeId).toEqual("pi_abc_999");
  });

  it("publishes a PaymentClearedEvent with orderId and stripeId", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_abc_999"),
    );

    await sendWebhook({ irrelevant: true }).expect(200);

    expect(PaymentClearedPublisher).toHaveBeenCalledWith(natsClient.client);
    expect(PaymentClearedPublisher.prototype.publish).toHaveBeenCalledWith({
      orderId: order.id,
      stripeId: "pi_abc_999",
    });
  });

  it("returns { received: true } in the response body", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id),
    );

    const response = await sendWebhook({ irrelevant: true }).expect(200);

    expect(response.body).toEqual({ received: true });
  });
});

describe("stripe webhook — idempotency", () => {
  it("does not reprocess when order.status is already COMPLETED", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId, { status: OrderStatus.COMPLETED });

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id),
    );

    await sendWebhook({ irrelevant: true }).expect(200);

    expect(await Payment.countDocuments({ orderId: order.id })).toEqual(0);
    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
  });

  // NOTE: updated test after fixing idempotency bug. Now verifies that redelivery
  // of the same Stripe event is properly deduplicated by catching duplicate key errors.
  it("deduplicates on redelivery and does not create duplicate Payments", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId); // status stays AWAITING_PAYMENT

    const event = buildSucceededEvent(order.id, "pi_abc_999");
    (stripe.webhooks.constructEvent as jest.Mock)
      .mockReturnValueOnce(event)
      .mockReturnValueOnce(event);

    await sendWebhook({ irrelevant: true }).expect(200);
    await sendWebhook({ irrelevant: true }).expect(200);

    const payments = await Payment.find({ orderId: order.id });
    expect(payments).toHaveLength(1); // Only one Payment due to idempotency check
    expect(PaymentClearedPublisher.prototype.publish).toHaveBeenCalledTimes(1);
  });
});

describe("stripe webhook — cancelled order refund", () => {
  it("processes succeeded payment_intent events for CANCELLED orders by creating refunds", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId, { status: OrderStatus.CANCELLED });

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildCancelledOrderEvent(order.id, "pi_abc_999"),
    );

    // Mock refunds.create to return a refund response
    (stripe.refunds.create as jest.Mock).mockResolvedValueOnce({
      id: "ref_mock_1",
      object: "refund", // Required for downstream assertion in cancelled-order test
    });

    await sendWebhook({ irrelevant: true }).expect(200);

    // Verify refunds.create was called with the correct payment intent
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: "pi_abc_999",
      },
      { idempotencyKey: "refund_pi_abc_999" },
    );
  });
});

describe("stripe webhook — verification inputs and metadata validation", () => {
  it("passes the raw request body, signature, and webhook secret to Stripe", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const event = {
      id: "evt_irrelevant",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_failed", metadata: {} } },
    };
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(event);

    const rawPayload = JSON.stringify(event);

    await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "sig_test_123")
      .send(rawPayload)
      .expect(200);

    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      expect.any(Buffer),
      "sig_test_123",
      "whsec_test_secret",
    );

    const receivedBody = (stripe.webhooks.constructEvent as jest.Mock).mock
      .calls[0][0] as Buffer;
    expect(receivedBody.toString()).toEqual(rawPayload);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["malformed", "not-a-mongo-id"],
  ])(
    "returns 400 when metadata.orderId is %s",
    async (_description, orderId) => {
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
        id: "evt_invalid_metadata",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_invalid_metadata",
            metadata: orderId === undefined ? {} : { orderId },
          },
        },
      });

      await sendWebhook({ irrelevant: true }).expect(400);

      expect(await Payment.countDocuments()).toEqual(0);
      expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
    },
  );
});

describe("stripe webhook — persisted delivery state", () => {
  it("marks a newly published Payment as published", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_published_123"),
    );

    await sendWebhook({ irrelevant: true }).expect(200);

    const payment = await Payment.findOne({ stripeId: "pi_published_123" });
    expect(payment?.published).toBe(true);
  });

  it("does not republish an existing Payment already marked as published", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);
    const payment = Payment.build({
      orderId: order.id,
      stripeId: "pi_already_published",
    });
    payment.set({ published: true });
    await payment.save();

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_already_published"),
    );

    await sendWebhook({ irrelevant: true }).expect(200);

    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(
      await Payment.countDocuments({ stripeId: "pi_already_published" }),
    ).toEqual(1);
  });

  it("retries publishing an existing Payment that was saved but not published", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);
    await Payment.build({
      orderId: order.id,
      stripeId: "pi_unpublished_123",
    }).save();

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_unpublished_123"),
    );

    await sendWebhook({ irrelevant: true }).expect(200);

    expect(PaymentClearedPublisher.prototype.publish).toHaveBeenCalledWith({
      orderId: order.id,
      stripeId: "pi_unpublished_123",
    });

    const payment = await Payment.findOne({ stripeId: "pi_unpublished_123" });
    expect(payment?.published).toBe(true);
  });

  it("recovers on redelivery after publishing a newly saved Payment initially fails", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);
    const event = buildSucceededEvent(order.id, "pi_publish_retry_123");

    (stripe.webhooks.constructEvent as jest.Mock)
      .mockReturnValueOnce(event)
      .mockReturnValueOnce(event);
    (
      PaymentClearedPublisher.prototype.publish as jest.Mock
    ).mockRejectedValueOnce(new Error("NATS unavailable"));

    await sendWebhook({ irrelevant: true }).expect((response) => {
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    let payment = await Payment.findOne({ stripeId: "pi_publish_retry_123" });
    expect(payment).not.toBeNull();
    expect(payment?.published).toBe(false);

    await sendWebhook({ irrelevant: true }).expect(200);

    payment = await Payment.findOne({ stripeId: "pi_publish_retry_123" });
    expect(payment?.published).toBe(true);
    expect(PaymentClearedPublisher.prototype.publish).toHaveBeenCalledTimes(2);
  });

  it("falls back to creating a Payment when the best-effort lookup fails", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);
    const lookupSpy = jest
      .spyOn(Payment, "findOne")
      .mockRejectedValueOnce(new Error("lookup failed"));

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_lookup_fallback_123"),
    );

    try {
      await sendWebhook({ irrelevant: true }).expect(200);
    } finally {
      lookupSpy.mockRestore();
    }

    const payment = await Payment.findOne({
      stripeId: "pi_lookup_fallback_123",
    });
    expect(payment).not.toBeNull();
    expect(payment?.published).toBe(true);
  });
});

describe("stripe webhook — concurrent duplicate-save recovery", () => {
  const makeWinningPayment = (published: boolean) => {
    const winningPayment = {
      published,
      set: jest.fn(function (
        this: { published: boolean },
        values: { published: boolean },
      ) {
        this.published = values.published;
        return this;
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };

    return winningPayment;
  };

  it("publishes the winning unpublished Payment after a matching duplicate-key error", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);
    const winningPayment = makeWinningPayment(false);

    const findSpy = jest
      .spyOn(Payment, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winningPayment as any);
    const saveSpy = jest
      .spyOn(Payment.prototype, "save")
      .mockRejectedValueOnce({
        code: 11000,
        keyPattern: { stripeId: "pi_race_123" },
      });

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_race_123"),
    );

    try {
      await sendWebhook({ irrelevant: true }).expect(200);
    } finally {
      findSpy.mockRestore();
      saveSpy.mockRestore();
    }

    expect(PaymentClearedPublisher.prototype.publish).toHaveBeenCalledWith({
      orderId: order.id,
      stripeId: "pi_race_123",
    });
    expect(winningPayment.set).toHaveBeenCalledWith({ published: true });
    expect(winningPayment.save).toHaveBeenCalledTimes(1);
  });

  it("does not republish the winning Payment when it is already marked published", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);
    const winningPayment = makeWinningPayment(true);

    const findSpy = jest
      .spyOn(Payment, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winningPayment as any);
    const saveSpy = jest
      .spyOn(Payment.prototype, "save")
      .mockRejectedValueOnce({
        code: 11000,
        keyPattern: { stripeId: "pi_race_published" },
      });

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_race_published"),
    );

    try {
      await sendWebhook({ irrelevant: true }).expect(200);
    } finally {
      findSpy.mockRestore();
      saveSpy.mockRestore();
    }

    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(winningPayment.set).not.toHaveBeenCalled();
    expect(winningPayment.save).not.toHaveBeenCalled();
  });

  it("rethrows duplicate-key errors that do not match the route's Stripe-id guard", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    const findSpy = jest.spyOn(Payment, "findOne").mockResolvedValueOnce(null);
    const saveSpy = jest
      .spyOn(Payment.prototype, "save")
      .mockRejectedValueOnce({
        code: 11000,
        keyPattern: { stripeId: 1 },
      });

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_realistic_duplicate_shape"),
    );

    try {
      await sendWebhook({ irrelevant: true }).expect((response) => {
        expect(response.status).toBeGreaterThanOrEqual(400);
      });
    } finally {
      findSpy.mockRestore();
      saveSpy.mockRestore();
    }

    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
  });

  it("rethrows non-duplicate persistence errors", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    const findSpy = jest.spyOn(Payment, "findOne").mockResolvedValueOnce(null);
    const saveSpy = jest
      .spyOn(Payment.prototype, "save")
      .mockRejectedValueOnce(new Error("Mongo write failed"));

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildSucceededEvent(order.id, "pi_write_error"),
    );

    try {
      await sendWebhook({ irrelevant: true }).expect((response) => {
        expect(response.status).toBeGreaterThanOrEqual(400);
      });
    } finally {
      findSpy.mockRestore();
      saveSpy.mockRestore();
    }

    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("stripe webhook — cancelled order refund errors", () => {
  it("treats Stripe's already-refunded response as an idempotent success", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId, { status: OrderStatus.CANCELLED });

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildCancelledOrderEvent(order.id, "pi_already_refunded"),
    );
    (stripe.refunds.create as jest.Mock).mockRejectedValueOnce({
      type: "StripeInvalidRequestError",
      message: "This payment has already been refunded",
    });

    await sendWebhook({ irrelevant: true }).expect(200);

    expect(await Payment.countDocuments({ orderId: order.id })).toEqual(0);
    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
  });

  it("propagates other Stripe refund errors so the webhook can be retried", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId, { status: OrderStatus.CANCELLED });

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce(
      buildCancelledOrderEvent(order.id, "pi_refund_error"),
    );
    (stripe.refunds.create as jest.Mock).mockRejectedValueOnce(
      new Error("Stripe refund unavailable"),
    );

    await sendWebhook({ irrelevant: true }).expect((response) => {
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    expect(await Payment.countDocuments({ orderId: order.id })).toEqual(0);
    expect(PaymentClearedPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

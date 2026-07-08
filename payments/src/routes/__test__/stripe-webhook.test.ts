import { OrderStatus } from "@venuepass/common";
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
    expect(stripe.refunds.create).toHaveBeenCalledWith({
      payment_intent: "pi_abc_999",
    });
  });
});

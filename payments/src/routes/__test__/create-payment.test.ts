import { OrderStatus } from "@venuepass/common/client";
import assert from "assert";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Order } from "../../models/order.model";
import { stripe } from "../../stripe";

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

const validPaymentPayload = (
  orderId: string,
  overrides?: Record<string, unknown>,
) => ({
  orderId,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
    id: "pi_mock_123",
    client_secret: "pi_mock_123_secret_abc",
  });
});

describe("create payment — authentication", () => {
  it("returns 401 when no cookie is provided", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments")
      .send(validPaymentPayload(order.id))
      .expect(401);
  });

  it("returns 401 when an invalid/garbage cookie is provided", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", ["session=not-a-real-jwt"])
      .send(validPaymentPayload(order.id))
      .expect(401);
  });

  it("returns 201 when a valid auth cookie is provided", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", await global.signin(userId))
      .send(validPaymentPayload(order.id))
      .expect(201);
  });
});

describe("create payment — orderId validation", () => {
  let cookie: string[];
  let userId: string;

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
  });

  it("returns 400 when orderId is missing", async () => {
    const payload = validPaymentPayload("irrelevant");
    delete (payload as any).orderId;

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(payload)
      .expect(400);
  });

  it("returns 400 when orderId is an empty string", async () => {
    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(""))
      .expect(400);
  });

  it("returns 400 when orderId is not a valid Mongo ObjectId", async () => {
    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload("not-a-valid-id"))
      .expect(400);
  });

  it("returns 404 when orderId is well-formed but no order exists with that id", async () => {
    const fakeOrderId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(fakeOrderId))
      .expect(404);
  });
});

describe("create payment — ownership", () => {
  it("returns 401 when the order belongs to a different user", async () => {
    const ownerId = new mongoose.Types.ObjectId().toHexString();
    const attackerId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(ownerId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", await global.signin(attackerId))
      .send(validPaymentPayload(order.id))
      .expect(401);
  });

  it("returns 201 when the order belongs to the signed-in user", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", await global.signin(userId))
      .send(validPaymentPayload(order.id))
      .expect(201);
  });
});

describe("create payment — order status checks", () => {
  let userId: string;
  let cookie: string[];

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
  });

  it("returns 400 when the order has already been cancelled", async () => {
    const order = await createOrder(userId, { status: OrderStatus.CANCELLED });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(400);
  });

  it("returns 400 when the order has already been paid", async () => {
    const order = await createOrder(userId, { status: OrderStatus.COMPLETED });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(400);
  });

  it("returns 201 when the order is awaiting payment", async () => {
    const order = await createOrder(userId, {
      status: OrderStatus.AWAITING_PAYMENT,
    });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);
  });

  it("returns 201 when the order is freshly created (not yet awaiting payment)", async () => {
    const order = await createOrder(userId, { status: OrderStatus.CREATED });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);
  });
});

describe("create payment — malformed request bodies", () => {
  it("returns 400 when the body is empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send({})
      .expect(400);
  });
});

describe("create payment — Stripe integration", () => {
  let userId: string;
  let cookie: string[];

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
  });

  it("returns the clientSecret from the created PaymentIntent", async () => {
    const order = await createOrder(userId);

    const response = await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    expect(response.body.clientSecret).toEqual("pi_mock_123_secret_abc");
  });

  it("calls stripe.paymentIntents.create with the order amount converted to cents", async () => {
    const order = await createOrder(userId, { price: 49.99 });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    const calls = (stripe.paymentIntents.create as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);

    // The mock call arguments are the function's args array itself
    assert(
      calls[0].length === 2,
      "stripe.paymentIntents.create should be called with 2 arguments",
    );

    const [config, options] = calls[0];

    // First argument: config object
    assert(
      config.amount === 4999,
      `expected amount to be 4999, got ${config.amount}`,
    );
    assert(config.currency === "usd", "expected currency to be usd");
    assert(
      config.description === `Payment for order ${order.id}`,
      `expected description to match`,
    );
    assert(
      config.metadata.orderId === order.id,
      "expected metadata orderId to match",
    );
    assert(
      config.metadata.userId === userId,
      "expected metadata userId to match",
    );
    assert(
      config.payment_method_types?.[0] === "card",
      "expected payment_method_types to include card",
    );

    // Second argument: options object
    assert(
      options.idempotencyKey ===
        `payment-intent-order-${order.id}-v${order.version}`,
      "expected idempotencyKey to match",
    );
  });

  it("rounds fractional-cent prices to the nearest cent", async () => {
    const order = await createOrder(userId, { price: 19.995 });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    const calls = (stripe.paymentIntents.create as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);

    // The mock call arguments are the function's args array itself
    assert(
      calls[0].length === 2,
      "stripe.paymentIntents.create should be called with 2 arguments",
    );

    const [config] = calls[0];

    // First argument: config object
    assert(
      config.amount === 2000,
      `expected amount to be 2000, got ${config.amount}`,
    );
  });

  it("includes orderId and userId in the PaymentIntent metadata", async () => {
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    const calls = (stripe.paymentIntents.create as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);

    // The mock call arguments are the function's args array itself
    assert(
      calls[0].length === 2,
      "stripe.paymentIntents.create should be called with 2 arguments",
    );

    const [config] = calls[0];

    // First argument: config object should contain the expected metadata fields
    assert(
      config.metadata.orderId === order.id,
      "expected metadata orderId to match",
    );
    assert(
      config.metadata.userId === userId,
      "expected metadata userId to match",
    );
  });

  it("does not call stripe.paymentIntents.create when the order is cancelled", async () => {
    const order = await createOrder(userId, { status: OrderStatus.CANCELLED });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(400);

    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe("create payment — additional request validation", () => {
  it.each([123, { value: "not-an-id" }, ["not-an-id"]])(
    "returns 400 when orderId is not a string: %p",
    async (orderId) => {
      const userId = new mongoose.Types.ObjectId().toHexString();

      await request(app)
        .post("/api/payments")
        .set("Cookie", await global.signin(userId))
        .send({ orderId })
        .expect(400);
    },
  );
});

describe("create payment — existing PaymentIntent reuse", () => {
  let userId: string;
  let cookie: string[];

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
    (stripe.paymentIntents.retrieve as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        id: "pi_existing_123",
        client_secret: "pi_existing_123_secret",
        status: "requires_payment_method",
      }),
    );
  });

  it("returns the existing client secret without creating another PaymentIntent", async () => {
    const order = await createOrder(userId);
    order.set({ stripeId: "pi_existing_123" });
    await order.save();

    const response = await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith(
      "pi_existing_123",
    );
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      clientSecret: "pi_existing_123_secret",
    });
  });

  it.each(["canceled", "succeeded"])(
    "creates a new PaymentIntent when the stored intent is %s",
    async (status) => {
      const order = await createOrder(userId);
      order.set({ stripeId: "pi_terminal_123" });
      await order.save();

      (stripe.paymentIntents.retrieve as jest.Mock).mockResolvedValueOnce({
        id: "pi_terminal_123",
        client_secret: "terminal_secret",
        status,
      });

      await request(app)
        .post("/api/payments")
        .set("Cookie", cookie)
        .send(validPaymentPayload(order.id))
        .expect(201);

      expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);

      const persisted = await Order.findById(order.id);
      expect(persisted?.stripeId).toEqual("pi_mock_123");
    },
  );

  it("propagates a Stripe retrieval failure without creating a new intent", async () => {
    const order = await createOrder(userId);
    order.set({ stripeId: "pi_existing_123" });
    await order.save();

    (stripe.paymentIntents.retrieve as jest.Mock).mockRejectedValueOnce(
      new Error("Stripe unavailable"),
    );

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect((response) => {
        expect(response.status).toBeGreaterThanOrEqual(400);
      });

    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe("create payment — persistence and Stripe error recovery", () => {
  let userId: string;
  let cookie: string[];

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
    (stripe.paymentIntents.retrieve as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        id: "pi_existing_123",
        client_secret: "pi_existing_123_secret",
        status: "requires_payment_method",
      }),
    );
  });

  it("stores the newly created PaymentIntent id on the order", async () => {
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    const persisted = await Order.findById(order.id);
    expect(persisted?.stripeId).toEqual("pi_mock_123");
  });

  it("returns the existing intent when Stripe reports an idempotency conflict", async () => {
    const order = await createOrder(userId);
    const error = {
      type: "api_error",
      rawType: "idempotency_error",
      raw: { id: "pi_from_idempotency_error" },
    };

    (stripe.paymentIntents.create as jest.Mock).mockRejectedValueOnce(error);
    (stripe.paymentIntents.retrieve as jest.Mock).mockResolvedValueOnce({
      id: "pi_from_idempotency_error",
      client_secret: "pi_recovered_secret",
      status: "requires_action",
    });

    const response = await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith(
      "pi_from_idempotency_error",
    );
    expect(response.body).toEqual({ clientSecret: "pi_recovered_secret" });

    const persisted = await Order.findById(order.id);
    expect(persisted?.stripeId).toBeUndefined();
  });

  it.each(["canceled", "succeeded"])(
    "rethrows an idempotency conflict when the recovered intent is %s",
    async (status) => {
      const order = await createOrder(userId);
      const error = {
        type: "api_error",
        rawType: "idempotency_error",
        raw: { id: "pi_terminal_recovered" },
      };

      (stripe.paymentIntents.create as jest.Mock).mockRejectedValueOnce(error);
      (stripe.paymentIntents.retrieve as jest.Mock).mockResolvedValueOnce({
        id: "pi_terminal_recovered",
        client_secret: "terminal_secret",
        status,
      });

      await request(app)
        .post("/api/payments")
        .set("Cookie", cookie)
        .send(validPaymentPayload(order.id))
        .expect((response) => {
          expect(response.status).toBeGreaterThanOrEqual(400);
        });
    },
  );

  it("propagates non-idempotency Stripe creation errors", async () => {
    const order = await createOrder(userId);
    (stripe.paymentIntents.create as jest.Mock).mockRejectedValueOnce(
      new Error("Stripe create failed"),
    );

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect((response) => {
        expect(response.status).toBeGreaterThanOrEqual(400);
      });
  });

  it("returns 500 when persisting the PaymentIntent id fails", async () => {
    const order = await createOrder(userId);
    const updateSpy = jest
      .spyOn(Order, "updateOne")
      .mockRejectedValueOnce(new Error("Mongo update failed"));

    try {
      await request(app)
        .post("/api/payments")
        .set("Cookie", cookie)
        .send(validPaymentPayload(order.id))
        .expect((response) => {
          expect(response.status).toBeGreaterThanOrEqual(400);
        });
    } finally {
      updateSpy.mockRestore();
    }
  });
});

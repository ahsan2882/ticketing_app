import { OrderStatus } from "@venuepass/common";
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

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 4999,
        currency: "usd",
        payment_method_types: ["card"],
      }),
    );
  });

  it("rounds fractional-cent prices to the nearest cent", async () => {
    const order = await createOrder(userId, { price: 19.995 });

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000 }),
    );
  });

  it("includes orderId and userId in the PaymentIntent metadata", async () => {
    const order = await createOrder(userId);

    await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send(validPaymentPayload(order.id))
      .expect(201);

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { orderId: order.id, userId },
      }),
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

import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Order, OrderStatus } from "../../models/order.model";
import { Ticket } from "../../models/ticket.model";

const createTicket = async (
  overrides: Partial<{ title: string; price: number }> = {},
) => {
  const ticket = Ticket.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    title: overrides.title ?? "Concert Ticket",
    price: overrides.price ?? 25,
  });
  await ticket.save();
  return ticket;
};

const createOrder = async (
  userId: string,
  ticket: any,
  overrides: Partial<{ status: OrderStatus; expiresAt: Date }> = {},
) => {
  const order = Order.build({
    userId,
    status: overrides.status ?? OrderStatus.CREATED,
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
    ticket,
  });
  await order.save();
  return order;
};

describe("find order - authentication", () => {
  it("returns 401 if the user is not signed in", async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString();

    await request(app).get(`/api/orders/${orderId}`).send().expect(401);
  });

  it("returns 401 if the auth cookie/token is malformed", async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Cookie", "session=not-a-valid-jwt")
      .send()
      .expect(401);
  });
});

describe("find order - not found", () => {
  it("returns 404 for valid-looking ObjectId that does not exist", async () => {
    const nonExistentOrderId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .get(`/api/orders/${nonExistentOrderId}`)
      .set("Cookie", await global.signin())
      .expect(404);
  });

  it("returns 404 for null orderId", async () => {
    await request(app)
      .get(`/api/orders/${null}`)
      .set("Cookie", await global.signin())
      .expect(404);
  });

  it("returns 404 for malformed ObjectId string", async () => {
    await request(app)
      .get(`/api/orders/not-an-objectid`)
      .set("Cookie", await global.signin())
      .expect(404);
  });
});

describe("find order - authorization / ownership", () => {
  it("rejects access to another user's order", async () => {
    const ticket = Ticket.build({
      title: "test",
      price: 100,
      userId: new mongoose.Types.ObjectId().toHexString(),
    });
    await ticket.save();

    const ownerUserId = new mongoose.Types.ObjectId().toHexString();
    const otherUserId = new mongoose.Types.ObjectId().toHexString();

    const order = Order.build({
      userId: ownerUserId,
      ticket,
      status: OrderStatus.CREATED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await order.save();

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", await global.signin(otherUserId))
      .send();

    expect(response.status).toBe(401);
  });

  it("does not leak order details when unauthorized", async () => {
    const ticket = await createTicket();
    const ownerId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(ownerId, ticket);

    const requesterCookie = await global.signin();

    const { body } = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", requesterCookie)
      .send()
      .expect(401);

    expect(body.errors).toBeDefined();
    expect(body).not.toHaveProperty("ticket");
    expect(body).not.toHaveProperty("userId");
  });

  it("allows access to own order", async () => {
    const ticket = Ticket.build({
      title: "test",
      price: 100,
      userId: new mongoose.Types.ObjectId().toHexString(),
    });
    await ticket.save();

    const ownerUserId = new mongoose.Types.ObjectId().toHexString();

    const order = Order.build({
      userId: ownerUserId,
      ticket,
      status: OrderStatus.CREATED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await order.save();

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", await global.signin(ownerUserId))
      .send();

    expect(response.status).toBe(200);
  });

  it("rejects access when userId is undefined in token", async () => {
    const ticket = Ticket.build({
      title: "test",
      price: 100,
      userId: new mongoose.Types.ObjectId().toHexString(),
    });
    await ticket.save();

    const order = Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      ticket,
      status: OrderStatus.CREATED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await order.save();

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", [
        "session=eyJpZCI6IiIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsIm5hbWUiOiJUZXN0IFRlc3QifQ",
      ])
      .send();

    expect(response.status).toBe(401);
  });
});

describe("find order - success response", () => {
  it("returns 200 and the order when the requester is the owner", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    const { body } = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body.id).toEqual(order.id);
    expect(body.userId).toEqual(userId);
    expect(body.status).toEqual(OrderStatus.CREATED);
  });

  it("populates the ticket field with full ticket data, not just an id", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket({ title: "Jazz Night", price: 40 });
    const order = await createOrder(userId, ticket);

    const { body } = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body.ticket).toBeDefined();
    expect(body.ticket.id).toEqual(ticket.id);
    expect(body.ticket.title).toEqual("Jazz Night");
    expect(body.ticket.price).toEqual(40);
  });

  it("returns order with correct response shape matching route transform", async () => {
    const ticket = Ticket.build({
      title: "Concert 2026",
      price: 120,
      userId: new mongoose.Types.ObjectId().toHexString(),
    });
    await ticket.save();

    const ownerUserId = new mongoose.Types.ObjectId().toHexString();
    const order = Order.build({
      userId: ownerUserId,
      ticket,
      status: OrderStatus.COMPLETED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    await order.save();

    const response = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", await global.signin(ownerUserId))
      .send();

    expect(response.status).toBe(200);
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.userId).toEqual(expect.any(String));
    expect(response.body.status).toBe(OrderStatus.COMPLETED);
    expect(response.body.expiresAt).toBeDefined();
    expect(response.body.ticket).toBeDefined();
    expect(response.body.ticket.title).toBe("Concert 2026");
    expect(response.body.ticket.price).toBe(120);
  });

  it("returns the order regardless of its status (e.g. Cancelled)", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket, {
      status: OrderStatus.CANCELLED,
    });

    const { body } = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body.status).toEqual(OrderStatus.CANCELLED);
  });

  it("includes expiresAt and createdAt/updatedAt timestamps", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    const { body } = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body.expiresAt).toBeDefined();
  });

  it("returns a version key (__v / version) consistent with optimistic concurrency setup", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    const { body } = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body).not.toHaveProperty("__v");
  });
});

describe("find order - edge cases", () => {
  it("returns 404 for a valid ObjectId that has valid hex but wrong length padding tricks", async () => {
    const cookie = await global.signin();

    // 24 hex chars is valid; this is 23 chars, should fail validity check -> 404
    await request(app)
      .get("/api/orders/abcdef1234567890abcdef")
      .set("Cookie", cookie)
      .send()
      .expect(404);
  });

  it("two different signed-in users cannot view each other's orders", async () => {
    const userAId = new mongoose.Types.ObjectId().toHexString();
    const cookieA = await global.signin(userAId);
    const cookieB = await global.signin();

    const ticket = await createTicket();
    const orderA = await createOrder(userAId, ticket);

    // Owner can fetch their own order
    await request(app)
      .get(`/api/orders/${orderA.id}`)
      .set("Cookie", cookieA)
      .send()
      .expect(200);

    // A different user cannot
    await request(app)
      .get(`/api/orders/${orderA.id}`)
      .set("Cookie", cookieB)
      .send()
      .expect(401);
  });

  it("fetching the same order twice returns identical data", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    const first = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const second = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(first.body).toEqual(second.body);
  });
});

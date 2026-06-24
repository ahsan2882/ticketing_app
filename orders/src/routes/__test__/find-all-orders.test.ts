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

describe("find all orders - authentication", () => {
  it("returns 401 if the user is not signed in", async () => {
    await request(app).get("/api/orders").send().expect(401);
  });

  it("returns 401 if the auth cookie/token is malformed", async () => {
    await request(app)
      .get("/api/orders")
      .set("Cookie", "session=not-a-valid-jwt")
      .send()
      .expect(401);
  });
});

describe("find all orders - when the user has no orders", () => {
  it("returns 200 and an empty array", async () => {
    const cookie = await global.signin();

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("returns an empty array even if other users have orders", async () => {
    const otherUserId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await createTicket();
    await createOrder(otherUserId, ticket);

    const cookie = await global.signin();

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body).toHaveLength(0);
  });
});

describe("find all orders - when the user has orders", () => {
  it("returns 200 and a single order", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].id).toEqual(order.id);
    expect(body[0].userId).toEqual(userId);
  });

  it("returns multiple orders belonging to the user", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);

    const ticket1 = await createTicket({ title: "Concert A", price: 20 });
    const ticket2 = await createTicket({ title: "Concert B", price: 30 });
    const ticket3 = await createTicket({ title: "Concert C", price: 40 });

    await createOrder(userId, ticket1);
    await createOrder(userId, ticket2);
    await createOrder(userId, ticket3);

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body).toHaveLength(3);
    const titles = body.map((order: any) => order.ticket.title).sort();
    expect(titles).toEqual(["Concert A", "Concert B", "Concert C"]);
  });

  it("populates the ticket field for each order with full ticket data", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket({ title: "Jazz Night", price: 45 });
    await createOrder(userId, ticket);

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body[0].ticket).toBeDefined();
    expect(body[0].ticket.id).toEqual(ticket.id);
    expect(body[0].ticket.title).toEqual("Jazz Night");
    expect(body[0].ticket.price).toEqual(45);
  });

  it("includes orders of every status (Created, Cancelled, Complete, AwaitingPayment)", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);

    const ticketA = await createTicket();
    const ticketB = await createTicket();
    const ticketC = await createTicket();
    const ticketD = await createTicket();

    await createOrder(userId, ticketA, { status: OrderStatus.CREATED });
    await createOrder(userId, ticketB, { status: OrderStatus.CANCELLED });
    await createOrder(userId, ticketC, { status: OrderStatus.COMPLETED });
    await createOrder(userId, ticketD, {
      status: OrderStatus.AWAITING_PAYMENT,
    });

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body).toHaveLength(4);
    const statuses = body.map((order: any) => order.status).sort();
    expect(statuses).toEqual(
      [
        OrderStatus.CREATED,
        OrderStatus.CANCELLED,
        OrderStatus.COMPLETED,
        OrderStatus.AWAITING_PAYMENT,
      ].sort(),
    );
  });
});

describe("find all orders - user scoping / isolation", () => {
  it("does not return orders belonging to other users", async () => {
    const userAId = new mongoose.Types.ObjectId().toHexString();
    const userBId = new mongoose.Types.ObjectId().toHexString();

    const ticketA = await createTicket({ title: "User A Ticket" });
    const ticketB = await createTicket({ title: "User B Ticket" });

    await createOrder(userAId, ticketA);
    await createOrder(userBId, ticketB);

    const cookieA = await global.signin(userAId);

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookieA)
      .send()
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].userId).toEqual(userAId);
    expect(body[0].ticket.title).toEqual("User A Ticket");
  });

  it("returns different results for different signed-in users on the same data set", async () => {
    const userAId = new mongoose.Types.ObjectId().toHexString();
    const userBId = new mongoose.Types.ObjectId().toHexString();

    const ticketA1 = await createTicket();
    const ticketA2 = await createTicket();
    const ticketB1 = await createTicket();

    await createOrder(userAId, ticketA1);
    await createOrder(userAId, ticketA2);
    await createOrder(userBId, ticketB1);

    const cookieA = await global.signin(userAId);
    const cookieB = await global.signin(userBId);

    const resA = await request(app)
      .get("/api/orders")
      .set("Cookie", cookieA)
      .send()
      .expect(200);

    const resB = await request(app)
      .get("/api/orders")
      .set("Cookie", cookieB)
      .send()
      .expect(200);

    expect(resA.body).toHaveLength(2);
    expect(resB.body).toHaveLength(1);
    expect(resA.body.every((o: any) => o.userId === userAId)).toBe(true);
    expect(resB.body.every((o: any) => o.userId === userBId)).toBe(true);
  });
});

describe("find all orders - response shape", () => {
  it("does not expose the Mongoose version key on returned orders", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    await createOrder(userId, ticket);

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body[0]).not.toHaveProperty("__v");
  });

  it("includes createdAt, updatedAt, and expiresAt on each order", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    await createOrder(userId, ticket);

    const { body } = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body[0].expiresAt).toBeDefined();
  });
});

describe("find all orders - repeat calls", () => {
  it("returns consistent results across repeated requests", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    await createOrder(userId, ticket);

    const first = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const second = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(first.body).toEqual(second.body);
  });

  it("reflects newly created orders on subsequent calls", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket1 = await createTicket();

    await createOrder(userId, ticket1);

    const first = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(first.body).toHaveLength(1);

    const ticket2 = await createTicket();
    await createOrder(userId, ticket2);

    const second = await request(app)
      .get("/api/orders")
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(second.body).toHaveLength(2);
  });
});

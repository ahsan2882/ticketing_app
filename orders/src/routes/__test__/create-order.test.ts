import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { OrderCreatedPublisher } from "../../events/publishers/order-created-publisher";
import { Order, OrderStatus } from "../../models/order.model";
import { Ticket } from "../../models/ticket.model";

jest.mock("../../events/publishers/order-created-publisher");

const createTicket = async (
  overrides: Partial<{ title: string; price: number }> = {},
) => {
  const ticket = Ticket.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    title: overrides.title ?? "Concert Ticket",
    price: overrides.price ?? 25,
    id: new mongoose.Types.ObjectId().toHexString(),
  });
  await ticket.save();
  return ticket;
};

describe("create order - authentication", () => {
  it("returns 401 if the user is not signed in", async () => {
    const ticket = await createTicket();
    await request(app)
      .post("/api/orders")
      .send({ ticketId: ticket.id })
      .expect(401);
  });

  it("returns 401 if the auth cookie/token is malformed", async () => {
    const ticket = await createTicket();
    await request(app)
      .post("/api/orders")
      .set("Cookie", "session=not-a-valid-jwt")
      .send({ ticketId: ticket.id })
      .expect(401);
  });
});

describe("create order - request validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
    (OrderCreatedPublisher as jest.Mock).mockClear();
    (OrderCreatedPublisher.prototype.publish as jest.Mock).mockClear();
  });
  it("returns 400 if ticketId is missing", async () => {
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({})
      .expect(400);
  });

  it("returns 400 if ticketId is an empty string", async () => {
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: "" })
      .expect(400);
  });

  it("returns 400 if ticketId is not a valid Mongo ObjectId", async () => {
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: "not-a-valid-id" })
      .expect(400);
  });

  it("returns 400 if ticketId is null", async () => {
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: null })
      .expect(400);
  });

  it("returns 400 if ticketId is a number instead of a string", async () => {
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: 12345 })
      .expect(400);
  });

  it("returns a body containing validation errors on failure", async () => {
    const { body } = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: "garbage" })
      .expect(400);

    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("does not call the publisher when validation fails", async () => {
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: "garbage" })
      .expect(400);
    expect(OrderCreatedPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("create order - ticket existence", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
    (OrderCreatedPublisher as jest.Mock).mockClear();
    (OrderCreatedPublisher.prototype.publish as jest.Mock).mockClear();
  });
  it("returns 404 if the ticket does not exist", async () => {
    const ticketId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId })
      .expect(404);
  });

  it("does not create an order when the ticket does not exist", async () => {
    const ticketId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId })
      .expect(404);

    const orders = await Order.find({});
    expect(orders).toHaveLength(0);
  });

  it("does not call the publisher when the ticket does not exist", async () => {
    const ticketId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId })
      .expect(404);

    expect(OrderCreatedPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("create order - ticket reservation check", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
    (OrderCreatedPublisher as jest.Mock).mockClear();
    (OrderCreatedPublisher.prototype.publish as jest.Mock).mockClear();
  });
  it("returns 400 if the ticket is already reserved by an existing order", async () => {
    const ticket = await createTicket();
    const existingOrder = Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      status: OrderStatus.CREATED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ticket,
    });
    await existingOrder.save();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(400);
  });

  it("does not create a second order for an already-reserved ticket", async () => {
    const ticket = await createTicket();
    const existingOrder = Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      status: OrderStatus.CREATED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ticket,
    });
    await existingOrder.save();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(400);

    const orders = await Order.find({ ticket: ticket.id });
    expect(orders).toHaveLength(1);
  });

  it("does not call the publisher when the ticket is reserved", async () => {
    const ticket = await createTicket();
    const existingOrder = Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      status: OrderStatus.CREATED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ticket,
    });
    await existingOrder.save();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(400);

    expect(OrderCreatedPublisher.prototype.publish).not.toHaveBeenCalled();
  });

  it("allows ordering a ticket whose previous reserving order was cancelled", async () => {
    const ticket = await createTicket();
    const cancelledOrder = Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      status: OrderStatus.CANCELLED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ticket,
    });
    await cancelledOrder.save();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);
  });
});

describe("create order - successful order creation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
    (OrderCreatedPublisher as jest.Mock).mockClear();
    (OrderCreatedPublisher.prototype.publish as jest.Mock).mockClear();
  });
  it("returns 201 with the created order", async () => {
    const ticket = await createTicket();
    const userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
    const { body } = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);

    expect(body.userId).toEqual(userId);
    expect(body.status).toEqual("created");
  });

  it("persists the order to the database", async () => {
    const ticket = await createTicket();
    const userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
    const { body } = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);

    const saved = await Order.findById(body.id);
    expect(saved).not.toBeNull();
    expect(saved!.userId).toEqual(userId);
  });

  it("sets an expiresAt timestamp in the future", async () => {
    const ticket = await createTicket();

    const { body } = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);

    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("associates the correct ticket with the order", async () => {
    const ticket = await createTicket({ title: "Jazz Night", price: 55 });

    const { body } = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);

    const saved = await Order.findById(body.id).populate("ticket");
    expect(saved!.ticket).toBeDefined();
    expect((saved!.ticket as any).id).toEqual(ticket.id);
  });

  it("calls OrderCreatedPublisher.publish exactly once", async () => {
    const ticket = await createTicket();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);
    const publisherInstance = (OrderCreatedPublisher as jest.Mock).mock
      .instances[0];
    expect(publisherInstance.publish).toHaveBeenCalledTimes(1);
  });

  it("publishes an event with the correct order id, status, and userId", async () => {
    const ticket = await createTicket();
    const userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
    const { body } = await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);
    const publisherInstance = (OrderCreatedPublisher as jest.Mock).mock
      .instances[0];
    expect(publisherInstance.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: body.id,
        status: "created",
        userId,
        version: 0,
      }),
    );
  });

  it("publishes an event with a trimmed ticket payload (only id and price)", async () => {
    const ticket = await createTicket({ title: "Jazz Night", price: 55 });

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);

    const publisherInstance = (OrderCreatedPublisher as jest.Mock).mock
      .instances[0];
    const publishedEvent = publisherInstance.publish.mock.calls[0][0];
    expect(publishedEvent.ticket).toEqual({
      id: ticket.id,
      price: ticket.price,
    });
    expect(publishedEvent.ticket.title).toBeUndefined();
  });

  it("publishes expiresAt as an ISO string", async () => {
    const ticket = await createTicket();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticket.id })
      .expect(201);

    const publishedEvent = (
      OrderCreatedPublisher.prototype.publish as jest.Mock
    ).mock.calls[0][0];

    expect(typeof publishedEvent.expiresAt).toBe("string");
    expect(new Date(publishedEvent.expiresAt).toISOString()).toEqual(
      publishedEvent.expiresAt,
    );
  });

  it("does not let a second user order the same ticket after the first order succeeds", async () => {
    const ticket = await createTicket();
    const cookieA = await global.signin();
    const cookieB = await global.signin();

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookieA)
      .send({ ticketId: ticket.id })
      .expect(201);

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookieB)
      .send({ ticketId: ticket.id })
      .expect(400);

    const orders = await Order.find({ ticket: ticket.id });
    expect(orders).toHaveLength(1);
  });

  it("allows the same user to order two different tickets", async () => {
    const ticketA = await createTicket({ title: "Ticket A" });
    const ticketB = await createTicket({ title: "Ticket B" });
    const userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticketA.id })
      .expect(201);

    await request(app)
      .post("/api/orders")
      .set("Cookie", cookie)
      .send({ ticketId: ticketB.id })
      .expect(201);

    const orders = await Order.find({ userId });
    expect(orders).toHaveLength(2);
  });
});

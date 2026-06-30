import { TicketStatus } from "@venuepass/common";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Order, OrderStatus } from "../../models/order.model";
import { Ticket } from "../../models/ticket.model";

const sellerId = new mongoose.Types.ObjectId().toHexString();
const buyerId = new mongoose.Types.ObjectId().toHexString();
const strangerId = new mongoose.Types.ObjectId().toHexString();

const buildTicketAndOrder = async (
  overrides: Partial<{ orderStatus: string }> = {},
) => {
  const ticket = Ticket.build({
    title: "Coldplay Live",
    price: 99,
    userId: sellerId,
    status: TicketStatus.RESERVED,
  } as any);
  await ticket.save();

  const order = Order.build({
    userId: buyerId,
    ticket: ticket.id,
    price: ticket.price,
    title: ticket.title,
    status: (overrides.orderStatus as OrderStatus) ?? OrderStatus.CREATED,
  } as any);
  await order.save();

  return { ticket, order };
};

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

describe("find orders by ticket - authentication", () => {
  it("returns 401 if the user is not authenticated", async () => {
    const { ticket } = await buildTicketAndOrder();

    await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .send()
      .expect(401);
  });

  it("returns 401 if the auth cookie/token is malformed", async () => {
    const ticket = await createTicket({ title: "Test Concert" });
    const nonExistentOrderId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .get(`/api/orders/by-ticket/${nonExistentOrderId}`)
      .set("Cookie", "session=not-a-valid-jwt")
      .send()
      .expect(401);
  });
});

describe("find orders by ticket - parameter validation", () => {
  let cookie: string[];

  beforeEach(async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(userId);
  });

  it("returns 404 for valid-looking ObjectId that does not exist", async () => {
    const nonExistentOrderId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .get(`/api/orders/by-ticket/${nonExistentOrderId}`)
      .set("Cookie", cookie)
      .send()
      .expect(404);
  });

  it("returns 400 for null ticketId parameter", async () => {
    await request(app)
      .get(`/api/orders/by-ticket/${null}`)
      .set("Cookie", cookie)
      .send()
      .expect(400);
  });

  it("returns 400 if the ticketId is not a valid Mongo ObjectId", async () => {
    const cookie = await global.signin(sellerId);

    await request(app)
      .get("/api/orders/by-ticket/not-a-valid-id")
      .set("Cookie", cookie)
      .send()
      .expect(400);
  });

  it("returns 400 for a numeric-looking but invalid ticketId", async () => {
    await request(app)
      .get("/api/orders/by-ticket/123456")
      .set("Cookie", cookie)
      .send()
      .expect(400);
  });
});

describe("find orders by ticket - order existence", () => {
  it("returns 404 if no order exists for the given ticket", async () => {
    const ticket = Ticket.build({
      title: "Unreserved Ticket",
      price: 50,
      userId: sellerId,
      status: "available",
    } as any);
    await ticket.save();

    const cookie = await global.signin(sellerId);

    await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(404);
  });

  it("returns 404 if the only order for the ticket is cancelled", async () => {
    const { ticket } = await buildTicketAndOrder({
      orderStatus: "cancelled",
    });

    const cookie = await global.signin(sellerId);

    await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(404);
  });
});

describe("find orders by ticket - authorization", () => {
  let ticket: any;
  let ownerCookie: string[];
  let cookie: string[];

  beforeEach(async () => {
    ticket = await createTicket();
    const ownerId = new mongoose.Types.ObjectId().toHexString();
    cookie = await global.signin(ownerId);
    ownerCookie = await global.signin();
  });

  it("allows the seller (ticket owner) to view the order, including populated ticket data", async () => {
    const { ticket, order } = await buildTicketAndOrder();

    const cookie = await global.signin(sellerId);

    const { body } = await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body.id).toEqual(order.id);
    expect(body.userId).toEqual(buyerId);
    expect(body.ticket).toBeDefined();
    expect(body.ticket.id).toEqual(ticket.id);
    expect(body.ticket.title).toEqual(ticket.title);
  });

  it("finds a COMPLETED order for the ticket (not just CREATED/AWAITING_PAYMENT)", async () => {
    const { ticket, order } = await buildTicketAndOrder({
      orderStatus: "completed",
    });

    const cookie = await global.signin(sellerId);

    const { body } = await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body.id).toEqual(order.id);
    expect(body.status).toEqual("completed");
  });

  it("returns 401 if the buyer (not the seller) tries to view the order", async () => {
    const { ticket } = await buildTicketAndOrder();

    const cookie = await global.signin(buyerId);

    await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(401);
  });

  it("returns 401 if an unrelated user tries to view the order", async () => {
    const { ticket } = await buildTicketAndOrder();

    const cookie = await global.signin(strangerId);

    await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(401);
  });

  it("does not leak order details in the response body when unauthorized", async () => {
    const { ticket, order } = await buildTicketAndOrder();

    const cookie = await global.signin(strangerId);

    const { body } = await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(401);

    // Body should be exactly the standard error shape, nothing order-related
    expect(body).toEqual({
      errors: [{ message: "Not authorized" }],
    });

    // Belt-and-suspenders: explicitly assert no order/ticket fields leaked
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("price");
    expect(body).not.toHaveProperty("ticket");

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(order.id);
    expect(serialized).not.toContain(buyerId);
  });

  it("ignores a cancelled order and finds the active one for the same ticket", async () => {
    const { ticket } = await buildTicketAndOrder({
      orderStatus: "cancelled",
    });

    const activeOrder = Order.build({
      userId: buyerId,
      ticket: ticket.id,
      price: ticket.price,
      title: ticket.title,
      status: "awaiting_payment",
    } as any);
    await activeOrder.save();

    const cookie = await global.signin(sellerId);

    const { body } = await request(app)
      .get(`/api/orders/by-ticket/${ticket.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(body.id).toEqual(activeOrder.id);
    expect(body.status).toEqual("awaiting_payment");
  });
});

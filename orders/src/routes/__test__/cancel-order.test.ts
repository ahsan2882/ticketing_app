import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { OrderCancelledPublisher } from "../../events/publishers/order-cancelled-publisher";
import { Order, OrderStatus } from "../../models/order.model";
import { Ticket } from "../../models/ticket.model";

jest.mock("../../events/publishers/order-cancelled-publisher");

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

describe("cancel order - authentication", () => {
  it("returns 401 if the user is not signed in", async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString();
    await request(app).delete(`/api/orders/${orderId}`).send().expect(401);
  });

  it("returns 401 if the auth cookie/token is malformed", async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString();
    await request(app)
      .delete(`/api/orders/${orderId}`)
      .set("Cookie", "session=not-a-valid-jwt")
      .send()
      .expect(401);
  });

  it("does not call the publisher when unauthenticated", async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString();
    await request(app).delete(`/api/orders/${orderId}`).send().expect(401);
    expect(OrderCancelledPublisher).not.toHaveBeenCalled();
  });
});

describe("cancel order - orderId validation", () => {
  it("returns 404 if orderId is not a valid Mongo ObjectId", async () => {
    const cookie = await global.signin();

    await request(app)
      .delete("/api/orders/not-a-valid-id")
      .set("Cookie", cookie)
      .send()
      .expect(404);
  });

  it("returns 404 for a numeric-looking but invalid orderId", async () => {
    const cookie = await global.signin();

    await request(app)
      .delete("/api/orders/123456")
      .set("Cookie", cookie)
      .send()
      .expect(404);
  });
});

describe("cancel order - order existence", () => {
  it("returns 404 if no order exists with a valid but unused ObjectId", async () => {
    const cookie = await global.signin();
    const orderId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .delete(`/api/orders/${orderId}`)
      .set("Cookie", cookie)
      .send()
      .expect(404);
  });

  it("does not call the publisher if the order does not exist", async () => {
    const cookie = await global.signin();
    const orderId = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .delete(`/api/orders/${orderId}`)
      .set("Cookie", cookie)
      .send()
      .expect(404);

    expect(OrderCancelledPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("cancel order - authorization", () => {
  it("returns 401 if the order belongs to a different user", async () => {
    const ticket = await createTicket();
    const ownerId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(ownerId, ticket);

    const requesterCookie = await global.signin();

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", requesterCookie)
      .send()
      .expect(401);
  });

  it("does not mutate the order's status when unauthorized", async () => {
    const ticket = await createTicket();
    const ownerId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(ownerId, ticket);

    const requesterCookie = await global.signin();

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", requesterCookie)
      .send()
      .expect(401);

    const untouched = await Order.findById(order.id);
    expect(untouched!.status).toEqual(OrderStatus.CREATED);
  });

  it("does not call the publisher when unauthorized", async () => {
    const ticket = await createTicket();
    const ownerId = new mongoose.Types.ObjectId().toHexString();
    const order = await createOrder(ownerId, ticket);

    const requesterCookie = await global.signin();

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", requesterCookie)
      .send()
      .expect(401);

    expect(OrderCancelledPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("cancel order - successful cancellation", () => {
  beforeEach(async () => {
    (OrderCancelledPublisher as jest.Mock).mockClear();
  });

  it("returns 200", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);
  });

  it("persists the order's status as cancelled in the database", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const updated = await Order.findById(order.id);
    expect(updated!.status).toEqual(OrderStatus.CANCELLED);
  });

  it("can cancel an order that is in Created status", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket, {
      status: OrderStatus.CREATED,
    });

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const updated = await Order.findById(order.id);
    expect(updated!.status).toEqual(OrderStatus.CANCELLED);
  });

  it("can cancel an order that is in AwaitingPayment status", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket, {
      status: OrderStatus.AWAITING_PAYMENT,
    });

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const updated = await Order.findById(order.id);
    expect(updated!.status).toEqual(OrderStatus.CANCELLED);
  });

  it("is idempotent-ish: cancelling an already-cancelled order still returns 204 and stays cancelled", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket, {
      status: OrderStatus.CANCELLED,
    });

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const updated = await Order.findById(order.id);
    expect(updated!.status).toEqual(OrderStatus.CANCELLED);
  });

  it("calls OrderCancelledPublisher.publish exactly once", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(OrderCancelledPublisher).toHaveBeenCalledTimes(1);
  });

  it("publishes an event with the correct order id and version", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(OrderCancelledPublisher.prototype.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: order.id,
        version: 0,
      }),
    );
  });

  it("publishes an event with only the ticket id (no price/title leakage)", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket({ title: "Jazz Night", price: 60 });
    const order = await createOrder(userId, ticket);

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);
    const publisherInstance = (OrderCancelledPublisher as jest.Mock).mock
      .instances[0];
    const publishedEvent = publisherInstance.publish.mock.calls[0][0];

    expect(publishedEvent.ticket).toEqual({ id: ticket.id });
    expect(publishedEvent.ticket.price).toBeUndefined();
    expect(publishedEvent.ticket.title).toBeUndefined();
  });

  it("does not include order status in the published event payload", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const publishedEvent = (
      OrderCancelledPublisher.prototype.publish as jest.Mock
    ).mock.calls[0][0];

    expect(publishedEvent.status).toBeUndefined();
  });

  it("only cancels the targeted order, leaving the user's other orders untouched", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);

    const ticketA = await createTicket({ title: "Ticket A" });
    const ticketB = await createTicket({ title: "Ticket B" });

    const orderA = await createOrder(userId, ticketA);
    const orderB = await createOrder(userId, ticketB);

    await request(app)
      .delete(`/api/orders/${orderA.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    const refreshedA = await Order.findById(orderA.id);
    const refreshedB = await Order.findById(orderB.id);

    expect(refreshedA!.status).toEqual(OrderStatus.CANCELLED);
    expect(refreshedB!.status).toEqual(OrderStatus.CREATED);
  });
});

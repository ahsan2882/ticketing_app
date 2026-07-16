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
    id: new mongoose.Types.ObjectId().toHexString(),
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
  it("returns 400 if orderId is not a valid Mongo ObjectId", async () => {
    const cookie = await global.signin();

    await request(app)
      .delete("/api/orders/not-a-valid-id")
      .set("Cookie", cookie)
      .send()
      .expect(400);
  });

  it("returns 400 for a numeric-looking but invalid orderId", async () => {
    const cookie = await global.signin();

    await request(app)
      .delete("/api/orders/123456")
      .set("Cookie", cookie)
      .send()
      .expect(400);
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

  it("rejects cancellation of an order already in terminal states", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);

    // CANCELLED status - should reject
    let ticket = await createTicket();
    let cancelledOrder = await createOrder(userId, ticket, {
      status: OrderStatus.CANCELLED,
    });

    await request(app)
      .delete(`/api/orders/${cancelledOrder.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(400);

    // COMPLETED status - should reject
    ticket = await createTicket();
    let completedOrder = await createOrder(userId, ticket, {
      status: OrderStatus.COMPLETED,
    });

    await request(app)
      .delete(`/api/orders/${completedOrder.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(400);
  });

  it("calls OrderCancelledPublisher exactly once", async () => {
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

    // Bump the order to version 1 before cancelling, so this test can
    // distinguish "always publishes 0" from "publishes the real version".
    order.status = OrderStatus.AWAITING_PAYMENT;
    await order.save();
    expect(order.version).toEqual(1);

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(200);

    expect(OrderCancelledPublisher.prototype.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: order.id,
        version: 2, // incremented again by the cancel's own save()
      }),
    );
  });

  it("returns a clean error (not a 500) when the order was modified concurrently between read and save", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);

    // Load a second, independent copy of the same order — simulating
    // another request/process holding a stale in-memory version.
    const staleCopy = await Order.findById(order.id);

    // Advance the real document's version via the first copy, so the
    // stale copy's version is now out of date.
    order.status = OrderStatus.AWAITING_PAYMENT;
    await order.save();

    // Now force the route to operate on the stale copy by monkey-patching
    // Order.findById for this one call so the route's internal lookup
    // returns the out-of-date document instead of doing a fresh read.
    const findByIdSpy = jest.spyOn(Order, "findById").mockImplementationOnce(
      () =>
        ({
          populate: () => Promise.resolve(staleCopy),
        }) as any,
    );

    try {
      const response = await request(app)
        .delete(`/api/orders/${order.id}`)
        .set("Cookie", cookie)
        .send();

      expect(response.status).not.toBe(500);
      expect(response.status).toBe(400); // update if you use a ConflictError/409 instead

      // The real document should still reflect the AWAITING_PAYMENT save,
      // not have been overwritten by the stale cancel attempt.
      const current = await Order.findById(order.id);
      expect(current!.status).toEqual(OrderStatus.AWAITING_PAYMENT);
    } finally {
      findByIdSpy.mockRestore();
    }
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

  it("does include order status in the published event payload", async () => {
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

    expect(publishedEvent.status).toBeDefined();
    expect(publishedEvent.status).toBe(OrderStatus.CANCELLED);
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

describe("cancel order - persistence and publication failures", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 500 and does not publish when a non-concurrency save error occurs", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);
    const saveSpy = jest
      .spyOn(Order.prototype, "save")
      .mockRejectedValueOnce(new Error("database unavailable"));

    try {
      await request(app)
        .delete(`/api/orders/${order.id}`)
        .set("Cookie", cookie)
        .send()
        .expect(500);

      expect(OrderCancelledPublisher.prototype.publish).not.toHaveBeenCalled();
      const persisted = await Order.findById(order.id);
      expect(persisted?.status).toEqual(OrderStatus.CREATED);
    } finally {
      saveSpy.mockRestore();
    }
  });

  it("keeps the cancelled database state and does not return success when publication fails", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const cookie = await global.signin(userId);
    const ticket = await createTicket();
    const order = await createOrder(userId, ticket);
    (
      OrderCancelledPublisher.prototype.publish as jest.Mock
    ).mockRejectedValueOnce(new Error("order-cancelled publish failed"));

    await request(app)
      .delete(`/api/orders/${order.id}`)
      .set("Cookie", cookie)
      .send()
      .expect(500);

    const persisted = await Order.findById(order.id);
    expect(persisted?.status).toEqual(OrderStatus.CANCELLED);
    expect(OrderCancelledPublisher.prototype.publish).toHaveBeenCalledTimes(1);
  });
});

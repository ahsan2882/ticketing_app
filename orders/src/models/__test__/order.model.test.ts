import { OrderStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import { Order } from "../order.model";
import { Ticket } from "../ticket.model";

const createTicket = async (title = "Concert Ticket") => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title,
    price: 45,
    userId: new mongoose.Types.ObjectId().toHexString(),
  });
  await ticket.save();
  return ticket;
};

const validAttrs = async () => ({
  userId: new mongoose.Types.ObjectId().toHexString(),
  ticket: await createTicket(),
  status: OrderStatus.CREATED,
});

describe("Order model", () => {
  it("builds and persists an order with the supplied fields", async () => {
    const attrs = await validAttrs();
    const order = Order.build(attrs);

    await order.save();

    expect(order.userId).toEqual(attrs.userId);
    expect(order.ticket.id).toEqual(attrs.ticket.id);
    expect(order.status).toEqual(OrderStatus.CREATED);
    expect(order.version).toEqual(0);
  });

  it("uses CREATED as the schema default when status is undefined", async () => {
    const attrs = await validAttrs();
    const order = Order.build({ ...attrs, status: undefined as any });

    await order.save();

    expect(order.status).toEqual(OrderStatus.CREATED);
  });

  it("creates a default expiry approximately fifteen minutes in the future", async () => {
    const attrs = await validAttrs();
    const beforeBuild = Date.now();
    const order = Order.build(attrs);
    const afterBuild = Date.now();

    expect(order.expiresAt.getTime()).toBeGreaterThanOrEqual(
      beforeBuild + 15 * 60 * 1000,
    );
    expect(order.expiresAt.getTime()).toBeLessThanOrEqual(
      afterBuild + 15 * 60 * 1000,
    );
  });

  it("preserves an explicitly supplied expiry", async () => {
    const attrs = await validAttrs();
    const expiresAt = new Date("2030-01-02T03:04:05.000Z");
    const order = Order.build({ ...attrs, expiresAt });

    await order.save();

    expect(order.expiresAt).toEqual(expiresAt);
  });

  it.each(["userId", "ticket"] as const)(
    "rejects an order missing the required field: %s",
    async (field) => {
      const attrs = await validAttrs();
      delete (attrs as any)[field];

      const order = Order.build(attrs as any);

      await expect(order.save()).rejects.toThrow();
    },
  );

  it("rejects an invalid order status", async () => {
    const attrs = await validAttrs();
    const order = Order.build({
      ...attrs,
      status: "not-a-real-status" as OrderStatus,
    });

    await expect(order.save()).rejects.toThrow();
  });

  it("defaults the completed-event delivery marker to false", async () => {
    const order = Order.build(await validAttrs());

    await order.save();

    expect(order.completedEventSent).toBe(false);
  });

  it("persists the completed-event delivery marker", async () => {
    const order = Order.build(await validAttrs());
    order.set({ completedEventSent: true });

    await order.save();

    const persisted = await Order.findById(order.id);
    expect(persisted?.completedEventSent).toBe(true);
  });

  it("keeps userId immutable after the order is created", async () => {
    const order = Order.build(await validAttrs());
    await order.save();
    const originalUserId = order.userId;

    order.set({ userId: new mongoose.Types.ObjectId().toHexString() });
    await order.save();

    const persisted = await Order.findById(order.id);
    expect(persisted?.userId).toEqual(originalUserId);
  });

  it("keeps the associated ticket immutable after the order is created", async () => {
    const attrs = await validAttrs();
    const order = Order.build(attrs);
    await order.save();
    const replacementTicket = await createTicket("Replacement Ticket");

    order.set({ ticket: replacementTicket });
    await order.save();

    const persisted = await Order.findById(order.id);
    expect(persisted?.ticket.toString()).toEqual(attrs.ticket.id);
  });

  it("serializes only the public order fields", async () => {
    const attrs = await validAttrs();
    const order = Order.build(attrs);
    order.set({ completedEventSent: true });
    await order.save();

    const json = order.toJSON();

    expect(json).toEqual(
      expect.objectContaining({
        id: order.id,
        userId: attrs.userId,
        status: OrderStatus.CREATED,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        version: 0,
      }),
    );
    expect(json).toHaveProperty("ticket");
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
    expect(json).not.toHaveProperty("completedEventSent");
    expect(json).not.toHaveProperty("updatedAt");
  });

  it("increments the version after a successful update save", async () => {
    const order = Order.build(await validAttrs());
    await order.save();

    order.set({ status: OrderStatus.AWAITING_PAYMENT });
    await order.save();

    expect(order.version).toEqual(1);
  });

  it("implements optimistic concurrency control", async () => {
    const order = Order.build(await validAttrs());
    await order.save();

    const firstInstance = (await Order.findById(order.id))!;
    const secondInstance = (await Order.findById(order.id))!;

    firstInstance.set({ status: OrderStatus.AWAITING_PAYMENT });
    secondInstance.set({ status: OrderStatus.CANCELLED });

    await firstInstance.save();

    await expect(secondInstance.save()).rejects.toThrow(
      mongoose.Error.VersionError,
    );
  });

  it.each([
    OrderStatus.CREATED,
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.COMPLETED,
  ])("allows only one active %s order per ticket", async (status) => {
    await Order.init();
    const ticket = await createTicket();
    const first = Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      ticket,
      status,
    });
    await first.save();

    const second = Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      ticket,
      status: OrderStatus.CREATED,
    });

    await expect(second.save()).rejects.toMatchObject({ code: 11000 });
  });

  it("allows multiple cancelled orders for the same ticket", async () => {
    await Order.init();
    const ticket = await createTicket();

    await Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      ticket,
      status: OrderStatus.CANCELLED,
    }).save();

    await expect(
      Order.build({
        userId: new mongoose.Types.ObjectId().toHexString(),
        ticket,
        status: OrderStatus.CANCELLED,
      }).save(),
    ).resolves.toBeDefined();
  });
});

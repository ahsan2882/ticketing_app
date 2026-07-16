import { OrderStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import { Order } from "../order.model";
import { Ticket } from "../ticket.model";

const validAttrs = () => ({
  id: new mongoose.Types.ObjectId().toHexString(),
  title: "Concert Ticket",
  price: 75,
  userId: new mongoose.Types.ObjectId().toHexString(),
});

describe("Ticket model", () => {
  it("builds a ticket using the supplied event id", async () => {
    const attrs = validAttrs();
    const ticket = Ticket.build(attrs);

    await ticket.save();

    expect(ticket.id).toEqual(attrs.id);
    expect(ticket.title).toEqual(attrs.title);
    expect(ticket.price).toEqual(attrs.price);
    expect(ticket.userId).toEqual(attrs.userId);
    expect(ticket.version).toEqual(0);
  });

  it.each(["title", "price", "userId"] as const)(
    "rejects a ticket missing the required field: %s",
    async (field) => {
      const attrs = validAttrs();
      delete (attrs as any)[field];

      const ticket = Ticket.build(attrs as any);

      await expect(ticket.save()).rejects.toThrow();
    },
  );

  it("rejects a negative price", async () => {
    const ticket = Ticket.build({ ...validAttrs(), price: -0.01 });

    await expect(ticket.save()).rejects.toThrow();
  });

  it("accepts a zero price", async () => {
    const ticket = Ticket.build({ ...validAttrs(), price: 0 });

    await expect(ticket.save()).resolves.toBeDefined();
  });

  it("persists an optional order id", async () => {
    const orderId = new mongoose.Types.ObjectId().toHexString();
    const ticket = Ticket.build({ ...validAttrs(), orderId });

    await ticket.save();

    const persisted = await Ticket.findById(ticket.id);
    expect(persisted?.orderId).toEqual(orderId);
  });

  it("serializes public ticket data without internal reservation bookkeeping", async () => {
    const attrs = validAttrs();
    const orderId = new mongoose.Types.ObjectId().toHexString();
    const ticket = Ticket.build({ ...attrs, orderId });
    await ticket.save();

    const json = ticket.toJSON();

    expect(json).toEqual({
      id: attrs.id,
      title: attrs.title,
      price: attrs.price,
      userId: attrs.userId,
      version: 0,
    });
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
    expect(json).not.toHaveProperty("orderId");
  });

  it("increments the version after an update save", async () => {
    const ticket = Ticket.build(validAttrs());
    await ticket.save();

    ticket.set({ price: 80 });
    await ticket.save();

    expect(ticket.version).toEqual(1);
  });

  it("implements optimistic concurrency control", async () => {
    const ticket = Ticket.build(validAttrs());
    await ticket.save();

    const firstInstance = (await Ticket.findById(ticket.id))!;
    const secondInstance = (await Ticket.findById(ticket.id))!;

    firstInstance.set({ price: 80 });
    secondInstance.set({ price: 90 });

    await firstInstance.save();

    await expect(secondInstance.save()).rejects.toThrow(
      mongoose.Error.VersionError,
    );
  });

  it.each([
    OrderStatus.CREATED,
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.COMPLETED,
  ])("reports the ticket as reserved by a %s order", async (status) => {
    const ticket = Ticket.build(validAttrs());
    await ticket.save();
    await Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      ticket,
      status,
    }).save();

    await expect(ticket.isReserved()).resolves.toBe(true);
  });

  it("reports the ticket as available when its only order is cancelled", async () => {
    const ticket = Ticket.build(validAttrs());
    await ticket.save();
    await Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      ticket,
      status: OrderStatus.CANCELLED,
    }).save();

    await expect(ticket.isReserved()).resolves.toBe(false);
  });

  it("reports a ticket with no orders as available", async () => {
    const ticket = Ticket.build(validAttrs());
    await ticket.save();

    await expect(ticket.isReserved()).resolves.toBe(false);
  });

  it("supports checking reservation state inside a MongoDB transaction", async () => {
    const ticket = Ticket.build(validAttrs());
    await ticket.save();
    await Order.build({
      userId: new mongoose.Types.ObjectId().toHexString(),
      ticket,
      status: OrderStatus.CREATED,
    }).save();
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await expect(ticket.isReserved(session)).resolves.toBe(true);
      });
    } finally {
      await session.endSession();
    }
  });
});

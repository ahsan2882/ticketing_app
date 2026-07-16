import { OrderStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import { Order } from "../order.model";

const validAttrs = () => ({
  id: new mongoose.Types.ObjectId().toHexString(),
  userId: new mongoose.Types.ObjectId().toHexString(),
  price: 99.99,
  status: OrderStatus.AWAITING_PAYMENT,
});

describe("Order model", () => {
  it("builds an order using the supplied event id", async () => {
    const attrs = validAttrs();
    const order = Order.build(attrs);

    await order.save();

    expect(order.id).toEqual(attrs.id);
    expect(order.userId).toEqual(attrs.userId);
    expect(order.price).toEqual(attrs.price);
    expect(order.status).toEqual(attrs.status);
    expect(order.version).toEqual(0);
  });

  it.each(["userId", "price", "status"] as const)(
    "rejects an order missing the required field: %s",
    async (field) => {
      const attrs = validAttrs();
      delete (attrs as any)[field];

      const order = Order.build(attrs as any);

      await expect(order.save()).rejects.toThrow();
    },
  );

  it("rejects a negative price", async () => {
    const order = Order.build({ ...validAttrs(), price: -0.01 });

    await expect(order.save()).rejects.toThrow();
  });

  it("accepts a zero price", async () => {
    const order = Order.build({ ...validAttrs(), price: 0 });

    await expect(order.save()).resolves.toBeDefined();
  });

  it("rejects an invalid order status", async () => {
    const order = Order.build({
      ...validAttrs(),
      status: "not-a-real-status" as OrderStatus,
    });

    await expect(order.save()).rejects.toThrow();
  });

  it("persists an optional Stripe PaymentIntent id", async () => {
    const order = Order.build({
      ...validAttrs(),
      stripeId: "pi_optional_123",
    });

    await order.save();

    const persisted = await Order.findById(order.id);
    expect(persisted?.stripeId).toEqual("pi_optional_123");
  });

  it("serializes the public fields and excludes Mongo internals", async () => {
    const attrs = validAttrs();
    const order = Order.build({
      ...attrs,
      stripeId: "pi_serialized_123",
    });
    await order.save();

    const json = order.toJSON();

    expect(json).toEqual({
      id: attrs.id,
      userId: attrs.userId,
      price: attrs.price,
      status: attrs.status,
      stripeId: "pi_serialized_123",
      version: 0,
    });
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
  });

  it("increments the version after a successful save", async () => {
    const order = Order.build(validAttrs());
    await order.save();

    order.set({ status: OrderStatus.COMPLETED });
    await order.save();

    expect(order.version).toEqual(1);
  });

  it("implements optimistic concurrency control", async () => {
    const order = Order.build(validAttrs());
    await order.save();

    const firstInstance = (await Order.findById(order.id))!;
    const secondInstance = (await Order.findById(order.id))!;

    firstInstance.set({ status: OrderStatus.COMPLETED });
    secondInstance.set({ status: OrderStatus.CANCELLED });

    await firstInstance.save();

    await expect(secondInstance.save()).rejects.toThrow(
      mongoose.Error.VersionError,
    );
  });
});

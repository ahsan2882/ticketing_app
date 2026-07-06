import { OrderStatus } from "@venuepass/common";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Order } from "../../../models/order.model";
import { natsClient } from "../../../nats-client";
import { OrderCancelledListener } from "../order-cancelled-listener";

const setup = async (initialVersion = 1) => {
  const listener = new OrderCancelledListener(natsClient.client);
  const ticketId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.AWAITING_PAYMENT,
    price: 20,
  });
  await order.save(); // always lands at version 0 regardless of what's set pre-save

  if (initialVersion !== 0) {
    // bypass optimisticConcurrency middleware to force a starting version
    await Order.updateOne(
      { _id: order.id },
      { $set: { version: initialVersion } },
    );
  }

  const seededOrder = await Order.findById(order.id);

  const data = {
    id: order.id,
    version: initialVersion + 1,
    ticket: { id: ticketId },
  };

  // @ts-ignore
  const msg: JsMsg = {
    ack: jest.fn(),
  };

  return { listener, order: seededOrder!, msg, data };
};

describe("OrderCancelledListener", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("has the correct durable name and subject", async () => {
    const { listener } = await setup();

    expect(listener.durableName).toEqual("payments-service-order-cancelled");
  });

  it("accepts a custom durable name", () => {
    const client = {} as any;
    const listener = new OrderCancelledListener(client, "custom-name");

    expect(listener.durableName).toEqual("custom-name");
  });

  it("cancels the order when the version matches", async () => {
    const { listener, order, msg, data } = await setup(1);

    await listener.onMessage(data, msg);

    const updated = await Order.findById(order.id);
    expect(updated!.status).toEqual(OrderStatus.CANCELLED);
    expect(updated!.version).toEqual(2);
  });

  it("acks after a successful cancellation", async () => {
    const { listener, order, msg, data } = await setup(1);

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalled();
  });

  it("throws and does not ack if the order does not exist at all", async () => {
    const { listener, msg, data } = await setup();
    const fakeId = new mongoose.Types.ObjectId().toHexString();

    await expect(
      listener.onMessage({ ...data, id: fakeId }, msg),
    ).rejects.toThrow("Order not found");

    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("no-ops and acks on a stale/duplicate delivery (order already at target version)", async () => {
    const { listener, order, msg, data } = await setup(2); // already cancelled once

    // redelivered event still expects to go from version 1 -> 2
    await listener.onMessage({ ...data, version: 2 }, msg);

    expect(msg.ack).toHaveBeenCalled();
    const updated = await Order.findById(order.id);
    expect(updated!.version).toEqual(2); // unchanged, no double-increment
  });

  it("no-ops and acks when order version is already ahead of the event's target", async () => {
    const { listener, order, msg, data } = await setup(5); // some later event already moved it past this one

    await listener.onMessage({ ...data, version: 3 }, msg);

    expect(msg.ack).toHaveBeenCalled();
    const updated = await Order.findById(order.id);
    expect(updated!.version).toEqual(5); // untouched
    expect(updated!.status).not.toEqual(OrderStatus.CANCELLED);
  });

  it("throws and does not ack on an out-of-order early arrival (order behind expected version)", async () => {
    const { listener, order, msg, data } = await setup(0); // order hasn't caught up yet

    await expect(
      listener.onMessage({ ...data, version: 2 }, msg),
    ).rejects.toThrow(/expected 1; retrying/);

    expect(msg.ack).not.toHaveBeenCalled();
    const updated = await Order.findById(order.id);
    expect(updated!.status).not.toEqual(OrderStatus.CANCELLED);
    expect(updated!.version).toEqual(0); // unchanged
  });

  it("does not double-increment version when findOneAndUpdate succeeds", async () => {
    const { listener, order, msg, data } = await setup(3);

    await listener.onMessage(data, msg);

    const updated = await Order.findById(order.id);
    expect(updated!.version).toEqual(4);
  });
});

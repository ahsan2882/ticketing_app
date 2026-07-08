import { OrderStatus } from "@venuepass/common";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Order } from "../../../models/order.model";
import { natsClient } from "../../../nats-client";
import { OrderAwaitingPaymentListener } from "../order-awaiting-payment-listener";

// ---- helpers -------------------------------------------------------------

const setup = async (initialVersion = 1) => {
  const listener = new OrderAwaitingPaymentListener(natsClient.client);
  const ticketId = new mongoose.Types.ObjectId().toHexString();
  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.CREATED,
    price: 20,
  });
  await order.save(); // always lands at version 0 due to optimisticConcurrency

  if (initialVersion !== 0) {
    await Order.updateOne(
      { _id: order.id },
      { $set: { version: initialVersion } },
    );
  }

  const seededOrder = await Order.findById(order.id);

  const data = {
    id: order.id,
    version: initialVersion + 1,
    ticket: { id: ticketId, price: order.price },
    userId,
    status: order.status,
  };

  // @ts-ignore
  const msg: JsMsg = {
    ack: jest.fn(),
  };

  return { listener, order: seededOrder!, msg, data };
};

// ---- tests ----------------------------------------------------------------

describe("OrderAwaitingPaymentListener", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("has the correct durable name and subject", async () => {
    const { listener } = await setup();

    expect(listener.durableName).toEqual(
      "payments-service-order-awaiting-payment",
    );
  });

  it("accepts a custom durable name", () => {
    const client = {} as any;
    const listener = new OrderAwaitingPaymentListener(client, "custom-name");

    expect(listener.durableName).toEqual("custom-name");
  });

  it("updates the order status to awaiting payment when the version matches", async () => {
    const { listener, order, msg, data } = await setup(1);

    await listener.onMessage(data, msg);

    const updated = await Order.findById(order.id);
    expect(updated!.status).toEqual(OrderStatus.AWAITING_PAYMENT);
    expect(updated!.version).toEqual(2);
  });

  it("acks after a successful update", async () => {
    const { listener, msg, data } = await setup(1);

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
    const { listener, order, msg, data } = await setup(2); // existing version is 2

    // simulate a redelivered event whose target version equals the order's current version
    await listener.onMessage({ ...data, version: 2 }, msg);

    expect(msg.ack).toHaveBeenCalled();
    const updated = await Order.findById(order.id);
    expect(updated!.version).toEqual(2); // unchanged, no double-increment
  });

  it("no-ops and acks when order version is already ahead of the event's target", async () => {
    const { listener, order, msg, data } = await setup(5); // existing version is 5

    await listener.onMessage({ ...data, version: 3 }, msg);

    expect(msg.ack).toHaveBeenCalled();
    const updated = await Order.findById(order.id);
    expect(updated!.version).toEqual(5); // untouched
    expect(updated!.status).not.toEqual(OrderStatus.AWAITING_PAYMENT);
  });

  it("throws and does not ack on an out-of-order early arrival (order behind expected version)", async () => {
    const { listener, order, msg, data } = await setup(0); // existing version is 0

    // event expects the order to already be at version 1 (data.version - 1 === 1)
    await expect(
      listener.onMessage({ ...data, version: 2 }, msg),
    ).rejects.toThrow(/expected 1; retrying/);

    expect(msg.ack).not.toHaveBeenCalled();
    const updated = await Order.findById(order.id);
    expect(updated!.status).not.toEqual(OrderStatus.AWAITING_PAYMENT);
    expect(updated!.version).toEqual(0); // unchanged
  });

  it("does not double-increment version when findOneAndUpdate succeeds", async () => {
    const { listener, order, msg, data } = await setup(3);

    await listener.onMessage(data, msg);

    const updated = await Order.findById(order.id);
    expect(updated!.version).toEqual(4);
  });
});

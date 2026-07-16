import { SUBJECTS } from "@venuepass/common";
import { OrderStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Order } from "../../../models/order.model";
import { natsClient } from "../../../nats-client";
import { OrderCompletedListener } from "../order-completed-listener";

const setup = async (initialVersion = 1) => {
  const listener = new OrderCompletedListener(natsClient.client);
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.AWAITING_PAYMENT,
    price: 20,
  });
  await order.save();

  if (initialVersion !== 0) {
    await Order.updateOne(
      { _id: order.id },
      { $set: { version: initialVersion } },
    );
  }

  const seededOrder = (await Order.findById(order.id))!;
  const data = {
    id: order.id,
    version: initialVersion + 1,
    status: OrderStatus.COMPLETED,
  } as any;
  const msg = {
    ack: jest.fn(),
  } as unknown as JsMsg;

  return { listener, order: seededOrder, data, msg };
};

describe("OrderCompletedListener", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("uses the expected subject and default durable name", () => {
    const listener = new OrderCompletedListener(natsClient.client);

    expect(listener.subject).toEqual(SUBJECTS.OrderCompleted);
    expect(listener.durableName).toEqual("payments-service-order-completed");
  });

  it("accepts a custom durable name", () => {
    const listener = new OrderCompletedListener(
      natsClient.client,
      "custom-completed-listener",
    );

    expect(listener.durableName).toEqual("custom-completed-listener");
  });

  it("marks the order as completed when the event version is next", async () => {
    const { listener, order, data, msg } = await setup(1);

    await listener.onMessage(data, msg);

    const updated = await Order.findById(order.id);
    expect(updated?.status).toEqual(OrderStatus.COMPLETED);
    expect(updated?.version).toEqual(2);
  });

  it("acks after a successful update", async () => {
    const { listener, data, msg } = await setup(1);

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it("throws and does not ack when the order does not exist", async () => {
    const { listener, data, msg } = await setup(1);

    await expect(
      listener.onMessage(
        {
          ...data,
          id: new mongoose.Types.ObjectId().toHexString(),
        },
        msg,
      ),
    ).rejects.toThrow("Order not found");

    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("acks a stale delivery without changing the order", async () => {
    const { listener, order, data, msg } = await setup(3);

    await listener.onMessage({ ...data, version: 3 }, msg);

    const updated = await Order.findById(order.id);
    expect(updated?.status).toEqual(OrderStatus.AWAITING_PAYMENT);
    expect(updated?.version).toEqual(3);
    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it("acks an event when the local order is already ahead", async () => {
    const { listener, order, data, msg } = await setup(5);

    await listener.onMessage({ ...data, version: 3 }, msg);

    const updated = await Order.findById(order.id);
    expect(updated?.status).toEqual(OrderStatus.AWAITING_PAYMENT);
    expect(updated?.version).toEqual(5);
    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it("throws without acking when the event arrives ahead of a missing version", async () => {
    const { listener, order, data, msg } = await setup(0);

    await expect(
      listener.onMessage({ ...data, version: 2 }, msg),
    ).rejects.toThrow(/expected 1; retrying/);

    const updated = await Order.findById(order.id);
    expect(updated?.status).toEqual(OrderStatus.AWAITING_PAYMENT);
    expect(updated?.version).toEqual(0);
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("does not ack when the database update fails", async () => {
    const { listener, data, msg } = await setup(1);
    jest
      .spyOn(Order, "findOneAndUpdate")
      .mockRejectedValueOnce(new Error("database unavailable"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "database unavailable",
    );

    expect(msg.ack).not.toHaveBeenCalled();
  });
});

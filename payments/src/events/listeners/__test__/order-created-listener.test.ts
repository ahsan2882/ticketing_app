import { OrderStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Order } from "../../../models/order.model";
import { natsClient } from "../../../nats-client";
import { OrderCreatedListener } from "../order-created-listener";

const setup = async () => {
  const client = {} as any;
  const listener = new OrderCreatedListener(client);

  const data = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    status: OrderStatus.CREATED,
    userId: new mongoose.Types.ObjectId().toHexString(),
    ticket: {
      id: new mongoose.Types.ObjectId().toHexString(),
      price: 20,
    },
    expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
  };

  // @ts-ignore
  const msg: JsMsg = {
    ack: jest.fn(),
  };

  return { listener, data, msg };
};

describe("OrderCreatedListener", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("has the correct durable name and subject", () => {
    const listener = new OrderCreatedListener(natsClient.client);

    expect(listener.durableName).toEqual("payments-service-order-created");
  });

  it("accepts a custom durable name", () => {
    const client = {} as any;
    const listener = new OrderCreatedListener(client, "custom-name");

    expect(listener.durableName).toEqual("custom-name");
  });

  it("creates a local order replica with the correct fields", async () => {
    const { listener, data, msg } = await setup();

    await listener.onMessage(data, msg);

    const order = await Order.findById(data.id);
    expect(order).not.toBeNull();
    expect(order!.price).toEqual(data.ticket.price);
    expect(order!.status).toEqual(data.status);
    expect(order!.userId).toEqual(data.userId);
    expect(order!.version).toEqual(data.version);
  });

  it("persists the order under the same id as the event", async () => {
    const { listener, data, msg } = await setup();

    await listener.onMessage(data, msg);

    const order = await Order.findById(data.id);
    expect(order!.id).toEqual(data.id);
  });

  it("acks the message after successful processing", async () => {
    const { listener, data, msg } = await setup();

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalled();
  });

  it("does not ack if the DB write fails", async () => {
    const { listener, data, msg } = await setup();
    jest
      .spyOn(Order, "findOneAndUpdate")
      .mockRejectedValueOnce(new Error("db down"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow("db down");

    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("is idempotent when the same event is redelivered", async () => {
    const { listener, data, msg } = await setup();

    await listener.onMessage(data, msg);
    await listener.onMessage(data, msg); // simulate redelivery

    const orders = await Order.find({ _id: data.id });
    expect(orders).toHaveLength(1);
    expect(orders[0]!.price).toEqual(data.ticket.price);
    expect(msg.ack).toHaveBeenCalledTimes(2);
  });
});

import { SUBJECTS, type ExpirationCompleteEvent } from "@venuepass/common";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Order, OrderStatus } from "../../../models/order.model";
import { Ticket } from "../../../models/ticket.model";
import { natsClient } from "../../../nats-client";
import { OrderCancelledPublisher } from "../../publishers/order-cancelled-publisher";
import { ExpirationCompleteListener } from "../expiration-complete-listener";

jest.mock("../../publishers/order-cancelled-publisher");

const setup = async () => {
  const listener = new ExpirationCompleteListener(natsClient.client);
  const ticket = Ticket.build({
    title: "concert",
    price: 20,
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
  });
  await ticket.save();

  const order = Order.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.CREATED,
    expiresAt: new Date(),
    ticket,
  });
  await order.save();

  const data: ExpirationCompleteEvent["data"] = {
    orderId: order.id,
  };

  // @ts-ignore
  const msg: JsMsg = { ack: jest.fn() };

  return { listener, order, ticket, data, msg };
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("ExpirationCompleteListener", () => {
  it("has the correct durable name and subject", () => {
    const client = {} as any;
    const listener = new ExpirationCompleteListener(client);

    expect(listener.durableName).toEqual("orders-service-expiration-complete");
    expect(listener.subject).toEqual(SUBJECTS.ExpirationComplete);
  });

  it("accepts a custom durable name", () => {
    const client = {} as any;
    const listener = new ExpirationCompleteListener(client, "custom-name");

    expect(listener.durableName).toEqual("custom-name");
  });

  it("updates the order status to cancelled", async () => {
    const { listener, order, msg, data } = await setup();

    await listener.onMessage(data, msg);

    const updatedOrder = await Order.findById(order.id);
    expect(updatedOrder!.status).toEqual(OrderStatus.CANCELLED);
  });

  it("publishes an OrderCancelledEvent with the correct payload", async () => {
    const { listener, order, ticket, msg, data } = await setup();

    await listener.onMessage(data, msg);

    const updatedOrder = await Order.findById(order.id);

    expect(OrderCancelledPublisher.prototype.publish).toHaveBeenCalledWith({
      id: order.id,
      version: updatedOrder!.version,
      status: OrderStatus.CANCELLED,
      ticket: { id: ticket.id },
    });
  });

  it("acks the message after successful processing", async () => {
    const { listener, msg, data } = await setup();

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalled();
  });

  it("throws and does not ack if the order is not found", async () => {
    const { listener, msg } = await setup();
    const fakeId = new mongoose.Types.ObjectId().toHexString();

    await expect(listener.onMessage({ orderId: fakeId }, msg)).rejects.toThrow(
      `Order with ID ${fakeId} not found`,
    );

    expect(msg.ack).not.toHaveBeenCalled();
    expect(OrderCancelledPublisher.prototype.publish).not.toHaveBeenCalled();
  });

  it("does not ack if save() fails", async () => {
    const { listener, msg, data } = await setup();
    jest
      .spyOn(Order.prototype, "save")
      .mockRejectedValueOnce(new Error("db down"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow("db down");

    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("acks and skips processing if order is already CANCELLED", async () => {
    const { listener, order, data, msg } = await setup();

    // Set order to already cancelled (terminal state)
    order.set({ status: OrderStatus.CANCELLED });
    await order.save();

    await listener.onMessage(data, msg);

    // Should ack but not call publisher or change status again
    expect(msg.ack).toHaveBeenCalled();
    expect(OrderCancelledPublisher.prototype.publish).not.toHaveBeenCalled();

    const updatedOrder = await Order.findById(order.id);
    expect(updatedOrder!.status).toEqual(OrderStatus.CANCELLED);
  });

  it("acks and skips processing if order is already COMPLETED", async () => {
    const { listener, order, data, msg } = await setup();

    // Set order to already paid (terminal state)
    order.set({ status: OrderStatus.COMPLETED });
    await order.save();

    await listener.onMessage(data, msg);

    // Should ack but not call publisher or change status again
    expect(msg.ack).toHaveBeenCalled();
    expect(OrderCancelledPublisher.prototype.publish).not.toHaveBeenCalled();

    const updatedOrder = await Order.findById(order.id);
    expect(updatedOrder!.status).toEqual(OrderStatus.COMPLETED);
  });

  it("does not ack when cancellation publication fails", async () => {
    const { listener, order, msg, data } = await setup();
    (
      OrderCancelledPublisher.prototype.publish as jest.Mock
    ).mockRejectedValueOnce(new Error("cancel publish failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "cancel publish failed",
    );

    const persisted = await Order.findById(order.id);
    expect(persisted?.status).toEqual(OrderStatus.CANCELLED);
    expect(msg.ack).not.toHaveBeenCalled();
  });
});

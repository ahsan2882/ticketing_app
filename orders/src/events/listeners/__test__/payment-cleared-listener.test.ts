import { SUBJECTS, type PaymentClearedEvent } from "@venuepass/common";
import { OrderStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Order } from "../../../models/order.model";
import { Ticket } from "../../../models/ticket.model";
import { natsClient } from "../../../nats-client";
import { OrderCompletedPublisher } from "../../publishers/order-completed-publisher";
import { PaymentRefundPublisher } from "../../publishers/payment-refund-publisher";
import { PaymentClearedListener } from "../payment-cleared-listener";

jest.mock("../../publishers/order-completed-publisher");
jest.mock("../../publishers/payment-refund-publisher");

const setup = async (status: OrderStatus = OrderStatus.AWAITING_PAYMENT) => {
  const listener = new PaymentClearedListener(natsClient.client);
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "Concert Ticket",
    price: 80,
    userId: new mongoose.Types.ObjectId().toHexString(),
  });
  await ticket.save();

  const order = Order.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    ticket,
    status,
  });
  await order.save();

  ticket.set({ orderId: order.id });
  await ticket.save();

  const data: PaymentClearedEvent["data"] = {
    orderId: order.id,
    stripeId: "pi_payment_cleared_123",
  };
  const msg = { ack: jest.fn() } as unknown as JsMsg;

  return { listener, ticket, order, data, msg };
};

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("PaymentClearedListener", () => {
  it("has the expected subject and default durable name", () => {
    const listener = new PaymentClearedListener(natsClient.client);

    expect(listener.subject).toEqual(SUBJECTS.PaymentCleared);
    expect(listener.durableName).toEqual("orders-service-payment-cleared");
  });

  it("accepts a custom durable name", () => {
    const listener = new PaymentClearedListener(
      natsClient.client,
      "custom-payment-cleared",
    );

    expect(listener.durableName).toEqual("custom-payment-cleared");
  });

  it("throws and does not ack when the order does not exist", async () => {
    const listener = new PaymentClearedListener(natsClient.client);
    const orderId = new mongoose.Types.ObjectId().toHexString();
    const msg = { ack: jest.fn() } as unknown as JsMsg;

    await expect(
      listener.onMessage({ orderId, stripeId: "pi_missing" }, msg),
    ).rejects.toThrow(`Order with ID ${orderId} not found`);

    expect(msg.ack).not.toHaveBeenCalled();
    expect(OrderCompletedPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(PaymentRefundPublisher.prototype.publish).not.toHaveBeenCalled();
  });

  it("refunds a payment that arrives after the order was cancelled", async () => {
    const { listener, order, data, msg } = await setup(OrderStatus.CANCELLED);

    await listener.onMessage(data, msg);

    expect(PaymentRefundPublisher.prototype.publish).toHaveBeenCalledWith({
      orderId: order.id,
      stripeId: data.stripeId,
    });
    expect(OrderCompletedPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalledTimes(1);

    const persisted = await Order.findById(order.id);
    expect(persisted?.status).toEqual(OrderStatus.CANCELLED);
  });

  it("does not ack a cancelled order when refund publication fails", async () => {
    const { listener, data, msg } = await setup(OrderStatus.CANCELLED);
    (
      PaymentRefundPublisher.prototype.publish as jest.Mock
    ).mockRejectedValueOnce(new Error("refund publish failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "refund publish failed",
    );

    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("acks an already completed order when its completion event was sent", async () => {
    const { listener, order, data, msg } = await setup(OrderStatus.COMPLETED);
    order.set({ completedEventSent: true });
    await order.save();

    await listener.onMessage(data, msg);

    expect(OrderCompletedPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(PaymentRefundPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it("republishes completion for a completed order whose event was not marked sent", async () => {
    const { listener, order, data, msg } = await setup(OrderStatus.COMPLETED);

    await listener.onMessage(data, msg);

    expect(OrderCompletedPublisher.prototype.publish).toHaveBeenCalledWith({
      id: order.id,
      version: order.version,
      status: OrderStatus.COMPLETED,
    });
    expect(msg.ack).toHaveBeenCalledTimes(1);

    const persisted = await Order.findById(order.id);
    expect(persisted?.completedEventSent).toBe(true);
  });

  it("does not mark or ack a completed order when completion republishing fails", async () => {
    const { listener, order, data, msg } = await setup(OrderStatus.COMPLETED);
    (
      OrderCompletedPublisher.prototype.publish as jest.Mock
    ).mockRejectedValueOnce(new Error("completion publish failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "completion publish failed",
    );

    const persisted = await Order.findById(order.id);
    expect(persisted?.completedEventSent).toBe(false);
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("does not ack when saving the recovery delivery marker fails", async () => {
    const { listener, data, msg } = await setup(OrderStatus.COMPLETED);
    jest
      .spyOn(Order.prototype, "save")
      .mockRejectedValueOnce(new Error("marker save failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "marker save failed",
    );

    expect(OrderCompletedPublisher.prototype.publish).toHaveBeenCalledTimes(1);
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("refunds instead of completing when the ticket was reassigned", async () => {
    const { listener, ticket, order, data, msg } = await setup();
    ticket.set({ orderId: new mongoose.Types.ObjectId().toHexString() });
    await ticket.save();

    await listener.onMessage(data, msg);

    expect(PaymentRefundPublisher.prototype.publish).toHaveBeenCalledWith({
      orderId: order.id,
      stripeId: data.stripeId,
    });
    expect(OrderCompletedPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalledTimes(1);

    const persisted = await Order.findById(order.id);
    expect(persisted?.status).toEqual(OrderStatus.AWAITING_PAYMENT);
  });

  it("does not ack a reassigned order when refund publication fails", async () => {
    const { listener, ticket, data, msg } = await setup();
    ticket.set({ orderId: new mongoose.Types.ObjectId().toHexString() });
    await ticket.save();
    (
      PaymentRefundPublisher.prototype.publish as jest.Mock
    ).mockRejectedValueOnce(new Error("refund publish failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "refund publish failed",
    );

    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("completes the matching order, publishes the event, records delivery, and acks", async () => {
    const { listener, order, data, msg } = await setup();

    await listener.onMessage(data, msg);

    const persisted = await Order.findById(order.id);
    expect(persisted?.status).toEqual(OrderStatus.COMPLETED);
    expect(persisted?.completedEventSent).toBe(true);
    expect(OrderCompletedPublisher.prototype.publish).toHaveBeenCalledWith({
      id: order.id,
      version: 1,
      status: OrderStatus.COMPLETED,
    });
    expect(PaymentRefundPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it("does not publish or ack when saving the completed status fails", async () => {
    const { listener, data, msg } = await setup();
    jest
      .spyOn(Order.prototype, "save")
      .mockRejectedValueOnce(new Error("order save failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "order save failed",
    );

    expect(OrderCompletedPublisher.prototype.publish).not.toHaveBeenCalled();
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("leaves the order completed but unmarked when completion publication fails", async () => {
    const { listener, order, data, msg } = await setup();
    (
      OrderCompletedPublisher.prototype.publish as jest.Mock
    ).mockRejectedValueOnce(new Error("completion publish failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "completion publish failed",
    );

    const persisted = await Order.findById(order.id);
    expect(persisted?.status).toEqual(OrderStatus.COMPLETED);
    expect(persisted?.completedEventSent).toBe(false);
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("does not ack when recording the completion-event marker fails", async () => {
    const { listener, order, data, msg } = await setup();
    jest
      .spyOn(Order, "updateOne")
      .mockRejectedValueOnce(new Error("marker update failed"));

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "marker update failed",
    );

    expect(OrderCompletedPublisher.prototype.publish).toHaveBeenCalledTimes(1);
    expect(msg.ack).not.toHaveBeenCalled();

    const persisted = await Order.findById(order.id);
    expect(persisted?.status).toEqual(OrderStatus.COMPLETED);
    expect(persisted?.completedEventSent).toBe(false);
  });
});

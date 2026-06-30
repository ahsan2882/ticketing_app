import {
  EventType,
  OrderStatus,
  TicketCategory,
  TicketStatus,
  type OrderCreatedEvent,
} from "@venuepass/common";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Ticket } from "../../../models/ticket.model";
import { natsClient } from "../../../nats-client";
import { TicketUpdatedPublisher } from "../../publishers/ticket-updated-publisher";
import { OrderCreatedListener } from "../order-created-listener";

jest.mock("../../publishers/ticket-updated-publisher");

const setUp = async () => {
  // create an instance of the listener
  const listener = new OrderCreatedListener(natsClient.client);

  // create and save an available ticket in the DB
  const ticket = Ticket.build({
    title: "Test Concert",
    price: 20,
    userId: new mongoose.Types.ObjectId().toHexString(),
    artist: "Test Artist",
    venue: "Test Venue",
    city: "Test City",
    eventDate: new Date(Date.now() + 86_400_000),
    eventType: EventType.Concert,
    category: TicketCategory.STANDARD,
  });
  await ticket.save();

  // create a fake OrderCreatedEvent data object referencing that ticket
  const data: OrderCreatedEvent["data"] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.CREATED,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    version: 0,
    ticket: {
      id: ticket.id,
      price: ticket.price,
    },
  };

  // create a fake message object
  // @ts-ignore
  const msg: JsMsg = { ack: jest.fn() };

  return { listener, data, msg, ticket };
};

describe("order created listener", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("sets the ticket status to RESERVED when the ticket is AVAILABLE", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);

    const ticket = await Ticket.findById(data.ticket.id);
    expect(ticket).toBeDefined();
    expect(ticket?.status).toEqual(TicketStatus.RESERVED);
  });

  it("sets orderId on the ticket to the id from the event", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);

    const ticket = await Ticket.findById(data.ticket.id);
    expect(ticket?.orderId).toEqual(data.id);
  });

  it("increments the ticket's version", async () => {
    const { listener, data, msg, ticket } = await setUp();
    const versionBeforeUpdate = ticket.version;

    await listener.onMessage(data, msg);

    const updatedTicket = await Ticket.findById(data.ticket.id);
    expect(updatedTicket?.version).toEqual(versionBeforeUpdate + 1);
  });

  it("publishes a TicketUpdatedEvent with the new RESERVED status", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);

    expect(TicketUpdatedPublisher).toHaveBeenCalled();
    const mockPublish = (TicketUpdatedPublisher as jest.Mock).mock.instances[0]
      .publish;
    expect(mockPublish).toHaveBeenCalled();

    const publishedData = mockPublish.mock.calls[0][0];
    expect(publishedData.id).toEqual(data.ticket.id);
    expect(publishedData.status).toEqual(TicketStatus.RESERVED);
  });

  it("acks the message after successfully reserving the ticket", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalled();
  });

  it("does NOT reserve the ticket and does NOT publish if it is already RESERVED by a different order", async () => {
    const { listener, data, msg, ticket } = await setUp();
    ticket.set({ status: TicketStatus.RESERVED, orderId: "some-other-order" });
    await ticket.save();

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await listener.onMessage(data, msg);

    const unchangedTicket = await Ticket.findById(data.ticket.id);
    expect(unchangedTicket?.orderId).toEqual("some-other-order");
    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("still acks the message when the ticket is already reserved (no-op)", async () => {
    const { listener, data, msg, ticket } = await setUp();
    ticket.set({ status: TicketStatus.RESERVED, orderId: "some-other-order" });
    await ticket.save();

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalled();
  });

  it("throws an error and does NOT ack if the ticket does not exist", async () => {
    const { listener, data, msg } = await setUp();
    const nonExistentTicketId = new mongoose.Types.ObjectId().toHexString();
    data.ticket.id = nonExistentTicketId;

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "Ticket not found",
    );
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("quietly no-ops (without an error log) when the same OrderCreatedEvent is redelivered after already being applied", async () => {
    const { listener, data, msg, ticket } = await setUp();

    // First application: reserves the ticket for data.id
    // @ts-ignore
    const firstMsg: JsMsg = { ack: jest.fn() };
    await listener.onMessage(data, firstMsg);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Redelivery of the exact same event
    await listener.onMessage(data, msg);

    const finalTicket = await Ticket.findById(data.ticket.id);
    expect(finalTicket?.orderId).toEqual(data.id);
    expect(finalTicket?.status).toEqual(TicketStatus.RESERVED);
    expect(msg.ack).toHaveBeenCalled();
    // Only the first call published; the redelivery should be a quiet no-op
    expect(TicketUpdatedPublisher).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("publishes a TicketUpdatedEvent with the correct id, status, userId, and price", async () => {
    const { listener, data, msg, ticket } = await setUp();

    await listener.onMessage(data, msg);

    const mockPublish = (TicketUpdatedPublisher as jest.Mock).mock.instances[0]
      .publish;
    const publishedData = mockPublish.mock.calls[0][0];

    expect(publishedData.id).toEqual(data.ticket.id);
    expect(publishedData.status).toEqual(TicketStatus.RESERVED);
    expect(publishedData.userId).toEqual(ticket.userId);
    expect(publishedData.price).toEqual(ticket.price);
  });

  it("only one of two concurrent OrderCreatedEvents for the same ticket results in a RESERVED ticket with the correct orderId, publishing exactly once", async () => {
    const { listener, data: dataA, ticket } = await setUp();

    const dataB: OrderCreatedEvent["data"] = {
      ...dataA,
      id: new mongoose.Types.ObjectId().toHexString(),
      ticket: { id: ticket.id, price: ticket.price },
    };

    // @ts-ignore
    const msgA: JsMsg = { ack: jest.fn() };
    // @ts-ignore
    const msgB: JsMsg = { ack: jest.fn() };

    await Promise.all([
      listener.onMessage(dataA, msgA),
      listener.onMessage(dataB, msgB),
    ]);

    const finalTicket = await Ticket.findById(ticket.id);
    expect(finalTicket?.status).toEqual(TicketStatus.RESERVED);
    expect([dataA.id, dataB.id]).toContain(finalTicket?.orderId);

    expect(msgA.ack).toHaveBeenCalled();
    expect(msgB.ack).toHaveBeenCalled();
    // Exactly one of the two should have actually applied the update and
    // published — the loser should have hit the no-op branch silently
    // (or loudly logged, in this specific race, since the two orderIds
    // ARE genuinely different — this is the one case where the new
    // console.error branch fires as part of completely normal concurrent
    // operation, not an upstream bug. Worth knowing this race will be
    // noisy in logs even though it's expected.)
    expect(TicketUpdatedPublisher).toHaveBeenCalledTimes(1);
  });
});

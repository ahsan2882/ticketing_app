import { type OrderCancelledEvent } from "@venuepass/common";
import {
  EventType,
  OrderStatus,
  TicketCategory,
  TicketStatus,
} from "@venuepass/common/client";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Ticket } from "../../../models/ticket.model";
import { natsClient } from "../../../nats-client";
import { TicketUpdatedPublisher } from "../../publishers/ticket-updated-publisher";
import { OrderCancelledListener } from "../order-cancelled-listener";

jest.mock("../../publishers/ticket-updated-publisher");

const buildTicket = async () => {
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
  return ticket;
};

const setUp = async () => {
  const listener = new OrderCancelledListener(natsClient.client);

  // create a ticket that's already RESERVED by some order
  const ticket = await buildTicket();
  const orderId = new mongoose.Types.ObjectId().toHexString();
  ticket.set({ status: TicketStatus.RESERVED, orderId });
  await ticket.save();

  const data: OrderCancelledEvent["data"] = {
    id: orderId,
    version: 0,
    ticket: { id: ticket.id },
    status: OrderStatus.CANCELLED,
  };

  // @ts-ignore
  const msg: JsMsg = { ack: jest.fn() };

  return { listener, data, msg, ticket, orderId };
};

describe("order cancelled listener", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("sets the ticket status back to AVAILABLE when the order matches the current reservation", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);

    const ticket = await Ticket.findById(data.ticket.id);
    expect(ticket?.status).toEqual(TicketStatus.AVAILABLE);
  });

  it("unsets orderId on the ticket", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);

    const ticket = await Ticket.findById(data.ticket.id);
    expect(ticket?.orderId).toBeUndefined();
  });

  it("increments the ticket's version", async () => {
    const { listener, data, msg, ticket } = await setUp();
    const versionBeforeUpdate = ticket.version;

    await listener.onMessage(data, msg);

    const updatedTicket = await Ticket.findById(data.ticket.id);
    expect(updatedTicket?.version).toEqual(versionBeforeUpdate + 1);
  });

  it("publishes a TicketUpdatedEvent with the correct id, status, userId, and price", async () => {
    const { listener, data, msg, ticket } = await setUp();

    await listener.onMessage(data, msg);

    const mockPublish = (TicketUpdatedPublisher as jest.Mock).mock.instances[0]
      .publish;
    const publishedData = mockPublish.mock.calls[0][0];

    expect(publishedData.id).toEqual(data.ticket.id);
    expect(publishedData.status).toEqual(TicketStatus.AVAILABLE);
    expect(publishedData.userId).toEqual(ticket.userId);
    expect(publishedData.price).toEqual(ticket.price);
  });

  it("publishes exactly once when two cancellations race, even though both ack", async () => {
    const ticket = await buildTicket();
    const orderA = new mongoose.Types.ObjectId().toHexString();
    ticket.set({ status: TicketStatus.RESERVED, orderId: orderA });
    await ticket.save();

    const listener = new OrderCancelledListener(natsClient.client);

    const dataA: OrderCancelledEvent["data"] = {
      id: orderA,
      version: 0,
      ticket: { id: ticket.id },
      status: OrderStatus.CANCELLED,
    };
    const dataB: OrderCancelledEvent["data"] = {
      id: new mongoose.Types.ObjectId().toHexString(),
      version: 0,
      ticket: { id: ticket.id },
      status: OrderStatus.CANCELLED,
    };

    // @ts-ignore
    const msgA: JsMsg = { ack: jest.fn() };
    // @ts-ignore
    const msgB: JsMsg = { ack: jest.fn() };

    await Promise.all([
      listener.onMessage(dataA, msgA),
      listener.onMessage(dataB, msgB),
    ]);

    expect(msgA.ack).toHaveBeenCalled();
    expect(msgB.ack).toHaveBeenCalled();
    // Only the message matching the ticket's actual orderId should have
    // triggered a real release + publish — the stale one should have
    // silently no-op'd via the exists()-but-filter-mismatch branch.
    expect(TicketUpdatedPublisher).toHaveBeenCalledTimes(1);
  });

  it("no-ops cleanly when the ticket was never reserved by any order", async () => {
    const ticket = await buildTicket();
    // ticket remains in its default post-creation state — never reserved,
    // no orderId ever set.
    expect(ticket.status).toEqual(TicketStatus.AVAILABLE);
    expect(ticket.orderId).toBeUndefined();

    const listener = new OrderCancelledListener(natsClient.client);
    const data: OrderCancelledEvent["data"] = {
      id: new mongoose.Types.ObjectId().toHexString(),
      version: 0,
      ticket: { id: ticket.id },
      status: OrderStatus.CANCELLED,
    };
    // @ts-ignore
    const msg: JsMsg = { ack: jest.fn() };

    await listener.onMessage(data, msg);

    const unchangedTicket = await Ticket.findById(ticket.id);
    expect(unchangedTicket?.status).toEqual(TicketStatus.AVAILABLE);
    expect(unchangedTicket?.orderId).toBeUndefined();
    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalled();
  });

  it("acks the message after successfully releasing the ticket", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalled();
  });

  it("does NOT release the ticket if it is reserved by a different order (stale/duplicate cancellation)", async () => {
    const { listener, data, msg, ticket } = await setUp();

    // simulate: a different order (B) now legitimately holds this ticket
    const otherOrderId = new mongoose.Types.ObjectId().toHexString();
    ticket.set({ status: TicketStatus.RESERVED, orderId: otherOrderId });
    await ticket.save();

    await listener.onMessage(data, msg);

    const unchangedTicket = await Ticket.findById(data.ticket.id);
    expect(unchangedTicket?.status).toEqual(TicketStatus.RESERVED);
    expect(unchangedTicket?.orderId).toEqual(otherOrderId);
    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
  });

  it("still acks the message when the ticket is held by a different order (no-op)", async () => {
    const { listener, data, msg, ticket } = await setUp();
    const otherOrderId = new mongoose.Types.ObjectId().toHexString();
    ticket.set({ status: TicketStatus.RESERVED, orderId: otherOrderId });
    await ticket.save();

    await listener.onMessage(data, msg);

    expect(msg.ack).toHaveBeenCalled();
  });

  it("does NOT change the ticket and does NOT publish if it is already AVAILABLE (already released)", async () => {
    const { listener, data, msg, ticket } = await setUp();
    ticket.set({ status: TicketStatus.AVAILABLE });
    ticket.set({ orderId: undefined });
    await ticket.save();

    await listener.onMessage(data, msg);

    const unchangedTicket = await Ticket.findById(data.ticket.id);
    expect(unchangedTicket?.status).toEqual(TicketStatus.AVAILABLE);
    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalled();
  });

  it("does NOT change the ticket and does NOT publish if it is already SOLD", async () => {
    const { listener, data, msg, ticket, orderId } = await setUp();
    ticket.set({ status: TicketStatus.SOLD, orderId });
    await ticket.save();

    await listener.onMessage(data, msg);

    const unchangedTicket = await Ticket.findById(data.ticket.id);
    expect(unchangedTicket?.status).toEqual(TicketStatus.SOLD);
    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalled();
  });

  it("throws an error and does NOT ack if the ticket does not exist", async () => {
    const { listener, data, msg } = await setUp();
    data.ticket.id = new mongoose.Types.ObjectId().toHexString();

    await expect(listener.onMessage(data, msg)).rejects.toThrow(
      "Ticket not found",
    );
    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("only releases the ticket for the order that actually holds it, when two cancellations race", async () => {
    const ticket = await buildTicket();
    const orderA = new mongoose.Types.ObjectId().toHexString();
    ticket.set({ status: TicketStatus.RESERVED, orderId: orderA });
    await ticket.save();

    const listener = new OrderCancelledListener(natsClient.client);

    const dataA: OrderCancelledEvent["data"] = {
      id: orderA,
      version: 0,
      ticket: { id: ticket.id },
      status: OrderStatus.CANCELLED,
    };
    // a stale cancellation for an order (B) that never actually held this ticket
    const dataB: OrderCancelledEvent["data"] = {
      id: new mongoose.Types.ObjectId().toHexString(),
      version: 0,
      ticket: { id: ticket.id },
      status: OrderStatus.CANCELLED,
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
    expect(finalTicket?.status).toEqual(TicketStatus.AVAILABLE);
    expect(finalTicket?.orderId).toBeUndefined();
    expect(msgA.ack).toHaveBeenCalled();
    expect(msgB.ack).toHaveBeenCalled();
  });
});

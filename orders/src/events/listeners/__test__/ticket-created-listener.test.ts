import { TicketStatus } from "@venuepass/common/client";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Ticket } from "../../../models/ticket.model";
import { natsClient } from "../../../nats-client";
import { TicketCreatedListener } from "../ticket-created-listener";

const setUp = async () => {
  // create an instance of the listener
  const listener = new TicketCreatedListener(natsClient.client);
  // create a fake data event
  const data = {
    version: 0,
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "Test",
    price: 10,
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: TicketStatus.AVAILABLE,
  };
  // create a fake message object
  // @ts-ignore
  const msg: JsMsg = { ack: jest.fn() };
  return { listener, data, msg };
};

describe("ticket created listener", () => {
  it("creates and saves a ticket when the event is triggered", async () => {
    const { listener, data, msg } = await setUp();
    // call the onMessage function with the data object + message object
    await listener.onMessage(data, msg);
    // write assertions to make sure the ticket was created
    const ticket = await Ticket.findById(data.id);
    expect(ticket).toBeDefined();
    expect(ticket?.title).toEqual(data.title);
    expect(ticket?.price).toEqual(data.price);
  });

  it("should ack the message once the ticket is created", async () => {
    const { listener, data, msg } = await setUp();
    // call the onMessage function with the data object + message object
    await listener.onMessage(data, msg);
    // write assertions to make sure the ack function was called
    expect(msg.ack).toHaveBeenCalled();
  });

  it("saves the correct userId on the created ticket", async () => {
    const { listener, data, msg } = await setUp();
    await listener.onMessage(data, msg);

    const ticket = await Ticket.findById(data.id);
    expect(ticket?.userId).toEqual(data.userId);
  });

  it("does not throw and still acks when the same event is delivered twice (idempotent redelivery)", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);
    await expect(listener.onMessage(data, msg)).resolves.not.toThrow();

    expect(msg.ack).toHaveBeenCalledTimes(2);

    const tickets = await Ticket.find({ _id: data.id });
    expect(tickets.length).toBe(1);
  });

  it("preserves the original ticket data on redelivery rather than re-saving", async () => {
    const { listener, data, msg } = await setUp();

    await listener.onMessage(data, msg);
    const firstSave = await Ticket.findById(data.id);

    // Redeliver the identical event a second time.
    await listener.onMessage(data, msg);
    const afterRedelivery = await Ticket.findById(data.id);

    expect(afterRedelivery?.title).toEqual(firstSave?.title);
    expect(afterRedelivery?.price).toEqual(firstSave?.price);
    expect(afterRedelivery?.version).toEqual(firstSave?.version);
  });

  it("saves the ticket with an _id matching the event's id", async () => {
    const { listener, data, msg } = await setUp();
    await listener.onMessage(data, msg);

    const ticket = await Ticket.findById(data.id);
    expect(ticket).not.toBeNull();
    expect(ticket!.id).toEqual(data.id);
  });

  it("acks a redelivered create event without inserting a duplicate ticket", async () => {
    const { listener, data } = await setUp();
    const firstMsg = { ack: jest.fn() } as unknown as JsMsg;
    const secondMsg = { ack: jest.fn() } as unknown as JsMsg;

    await listener.onMessage(data, firstMsg);
    await listener.onMessage(data, secondMsg);

    expect(await Ticket.countDocuments({ _id: data.id })).toBe(1);
    expect(secondMsg.ack).toHaveBeenCalled();
  });
});

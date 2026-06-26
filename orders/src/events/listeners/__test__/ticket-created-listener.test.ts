import { TicketStatus, type TicketCreatedEvent } from "@venuepass/common";
import { natsClient } from "../../../nats-client";
import { TicketCreatedListener } from "../ticket-created-listener";
import mongoose from "mongoose";
import type { JsMsg } from "nats";
import { Ticket } from "../../../models/ticket.model";

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
});

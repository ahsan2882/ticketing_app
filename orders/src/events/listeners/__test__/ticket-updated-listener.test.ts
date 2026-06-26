import type { JsMsg } from "nats";
import { TicketStatus, type TicketUpdatedEvent } from "@venuepass/common";
import { natsClient } from "../../../nats-client";
import { TicketUpdatedListener } from "../ticket-updated-listener";
import mongoose from "mongoose";
import { Ticket } from "../../../models/ticket.model";

const setUp = async () => {
  //creates and saves a ticket with the updated incoming version
  const listener = new TicketUpdatedListener(natsClient.client);

  // create and save a ticket
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    title: "Test",
    price: 10,
  });
  await ticket.save();
  // create a fake data event
  const data: TicketUpdatedEvent["data"] = {
    id: ticket.id,
    version: ticket.version + 1,
    title: "Updated title",
    price: 20,
    status: TicketStatus.AVAILABLE,
    userId: ticket.userId,
  };
  // create a fake message object
  // @ts-ignore
  const msg: JsMsg = { ack: jest.fn() };
  return { listener, data, msg, ticket };
};

describe("ticket updated listener", () => {
  it("updates a ticket when the event is triggered", async () => {
    const { listener, data, msg } = await setUp();
    await listener.onMessage(data, msg);

    const updatedTicket = await Ticket.findById(data.id);
    expect(updatedTicket).toBeDefined();
    expect(updatedTicket?.title).toEqual("Updated title");
    expect(updatedTicket?.price).toEqual(20);
  });

  it("should ack the message when version is already processed (replayed event)", async () => {
    const listener = new TicketUpdatedListener(natsClient.client);

    // Set up a ticket at version 5
    const existingTicket = Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      userId: new mongoose.Types.ObjectId().toHexString(),
      title: "Existing Title",
      price: 100,
    });
    existingTicket.set({ version: 5 });
    await existingTicket.save();

    // Create an event for version 5 (same as ticket) - already processed
    const dataOldVersion: TicketUpdatedEvent["data"] = {
      id: existingTicket.id,
      version: existingTicket.version, // Same version as ticket
      title: "Older Title",
      price: 50,
      status: TicketStatus.AVAILABLE,
      userId: existingTicket.userId,
    };
    // @ts-ignore
    const msg: JsMsg = { ack: jest.fn() };

    await listener.onMessage(dataOldVersion, msg);

    // Ticket should not be modified (still original values)
    const ticket = await Ticket.findById(existingTicket.id);
    expect(ticket?.title).toEqual("Existing Title");
    expect(ticket?.price).toEqual(100);
    // Should have acked the replayed message
    expect(msg.ack).toHaveBeenCalled();
  });

  it("should nack the message when version gap is detected (out-of-order event)", async () => {
    const listener = new TicketUpdatedListener(natsClient.client);

    // Set up a ticket at version 5
    const existingTicket = Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      userId: new mongoose.Types.ObjectId().toHexString(),
      title: "Existing Title",
      price: 100,
    });
    await existingTicket.save();
    await Ticket.updateOne(
      { _id: existingTicket.id },
      { $set: { version: 5 } },
    );
    const ticketAtVersion5 = await Ticket.findById(existingTicket.id);

    // Create an event for version 8 (3 versions ahead) - out-of-order gap
    const dataGap: TicketUpdatedEvent["data"] = {
      id: ticketAtVersion5!.id,
      version: ticketAtVersion5!.version + 3, // Gap of 3 versions
      title: "Future Title",
      price: 200,
      status: TicketStatus.AVAILABLE,
      userId: ticketAtVersion5!.userId,
    };

    // @ts-ignore
    const msg: JsMsg = {
      ack: jest.fn(),
      nak: jest.fn(),
    }; // Mock both ack and Nak methods

    await listener.onMessage(dataGap, msg);

    // Ticket should not be modified
    const ticket = await Ticket.findById(existingTicket.id);
    expect(ticket?.title).toEqual("Existing Title");
    expect(ticket?.price).toEqual(100);
    // Should have nak'd to request redelivery with backoff
    expect(msg.nak).toHaveBeenCalled();
  });
});

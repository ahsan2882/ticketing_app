import mongoose from "mongoose";
import { Ticket } from "../ticket.model";
import { EventType, TicketCategory } from "@venuepass/common";

describe("ticket model - ", () => {
  it("implements optimistic concurrency control", async () => {
    const ticket = Ticket.build({
      title: "Test",
      price: 50,
      userId: new mongoose.Types.ObjectId().toHexString(),
      artist: "artist",
      venue: "Expo",
      city: "NewYork",
      eventDate: new Date(Date.now() + 86_400_000), // tomorrow
      eventType: EventType.Conference,
      category: TicketCategory.STANDARD,
      seat: "X23",
    });
    await ticket.save();
    const firstInstance = (await Ticket.findById(ticket.id))!;
    const secondInstance = (await Ticket.findById(ticket.id))!;

    firstInstance.set({ price: 100 });
    secondInstance.set({ price: 300 });

    await firstInstance.save();
    try {
      await secondInstance.save();
    } catch (error) {
      return Promise.resolve();
    }
    return Promise.reject("Should not reach this point");
  });

  it("should show an incremented version after a successful update", async () => {
    const ticket = Ticket.build({
      title: "Test",
      price: 50,
      userId: new mongoose.Types.ObjectId().toHexString(),
      artist: "artist",
      venue: "Expo",
      city: "NewYork",
      eventDate: new Date(Date.now() + 86_400_000), // tomorrow
      eventType: EventType.Conference,
      category: TicketCategory.STANDARD,
      seat: "X23",
    });
    await ticket.save();
    expect(ticket.version).toEqual(0);

    let fetchedTicket = await Ticket.findById(ticket.id);
    fetchedTicket!.set({ price: 200 });
    await fetchedTicket!.save();
    expect(fetchedTicket!.version).toBe(1);

    fetchedTicket = await Ticket.findById(ticket.id);
    fetchedTicket!.set({ seat: "A-24" });
    await fetchedTicket!.save();
    expect(fetchedTicket!.version).toBe(2);
  });
});

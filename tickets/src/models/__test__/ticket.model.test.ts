import { EventType, TicketCategory, TicketStatus } from "@venuepass/common";
import mongoose from "mongoose";
import { Ticket } from "../ticket.model";

const validAttrs = () => ({
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

describe("ticket model - ", () => {
  it("implements optimistic concurrency control", async () => {
    const ticket = Ticket.build(validAttrs());
    await ticket.save();
    const firstInstance = (await Ticket.findById(ticket.id))!;
    const secondInstance = (await Ticket.findById(ticket.id))!;

    firstInstance.set({ price: 100 });
    secondInstance.set({ price: 300 });

    await firstInstance.save();
    await expect(secondInstance.save()).rejects.toThrow(
      mongoose.Error.VersionError,
    );
  });

  it("should show an incremented version after a successful update", async () => {
    const ticket = Ticket.build(validAttrs());
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

  describe("required fields", () => {
    const requiredFields = [
      "title",
      "price",
      "userId",
      "artist",
      "venue",
      "city",
      "eventDate",
      "eventType",
      "category",
    ] as const;

    it.each(requiredFields)(
      "rejects a ticket missing the required field: %s",
      async (field) => {
        const attrs = validAttrs();
        delete (attrs as any)[field];
        const ticket = Ticket.build(attrs as any);

        await expect(ticket.save()).rejects.toThrow();
      },
    );
  });

  describe("price validation", () => {
    it("rejects a price of 0", async () => {
      const ticket = Ticket.build({ ...validAttrs(), price: 0 });
      await expect(ticket.save()).rejects.toThrow();
    });

    it("rejects a negative price", async () => {
      const ticket = Ticket.build({ ...validAttrs(), price: -10 });
      await expect(ticket.save()).rejects.toThrow();
    });

    it("accepts the minimum valid price (0.01)", async () => {
      const ticket = Ticket.build({ ...validAttrs(), price: 0.01 });
      await expect(ticket.save()).resolves.toBeDefined();
    });
  });

  describe("title validation", () => {
    it("rejects a title shorter than 3 characters", async () => {
      const ticket = Ticket.build({ ...validAttrs(), title: "ab" });
      await expect(ticket.save()).rejects.toThrow();
    });

    it("accepts a title exactly 3 characters long", async () => {
      const ticket = Ticket.build({ ...validAttrs(), title: "abc" });
      await expect(ticket.save()).resolves.toBeDefined();
    });

    it("trims surrounding whitespace from title", async () => {
      const ticket = Ticket.build({ ...validAttrs(), title: "  Concert  " });
      await ticket.save();
      expect(ticket.title).toEqual("Concert");
    });
  });

  describe("enum validation", () => {
    it("rejects an invalid eventType value", async () => {
      const ticket = Ticket.build({
        ...validAttrs(),
        eventType: "not-a-real-type" as any,
      });
      await expect(ticket.save()).rejects.toThrow();
    });

    it("rejects an invalid category value", async () => {
      const ticket = Ticket.build({
        ...validAttrs(),
        category: "not-a-real-category" as any,
      });
      await expect(ticket.save()).rejects.toThrow();
    });
  });

  describe("eventDate validation", () => {
    // NEW: closes the gap identified in review — the schema previously had
    // no guard against creating a ticket for an event in the past. This
    // test only passes once the validator is added to eventDate in the
    // schema.
    it("rejects an eventDate in the past", async () => {
      const ticket = Ticket.build({
        ...validAttrs(),
        eventDate: new Date(Date.now() - 86_400_000), // yesterday
      });
      await expect(ticket.save()).rejects.toThrow();
    });

    it("accepts an eventDate in the future", async () => {
      const ticket = Ticket.build({
        ...validAttrs(),
        eventDate: new Date(Date.now() + 86_400_000),
      });
      await expect(ticket.save()).resolves.toBeDefined();
    });
  });

  describe("defaults", () => {
    it("defaults status to AVAILABLE on a freshly built ticket", async () => {
      const ticket = Ticket.build(validAttrs());
      await ticket.save();
      expect(ticket.status).toEqual(TicketStatus.AVAILABLE);
    });

    it("has no orderId by default", async () => {
      const ticket = Ticket.build(validAttrs());
      await ticket.save();
      expect(ticket.orderId).toBeUndefined();
    });
  });

  describe("toJSON transform", () => {
    it("excludes __v and includes version in the serialized output", async () => {
      const ticket = Ticket.build(validAttrs());
      await ticket.save();
      const json = ticket.toJSON();
      expect(json).not.toHaveProperty("__v");
      expect(json).toHaveProperty("version", 0);
      expect(json).toHaveProperty("id", ticket.id);
    });

    it("includes all expected user-facing fields in the serialized output", async () => {
      const attrs = validAttrs();
      const ticket = Ticket.build(attrs);
      await ticket.save();

      const json = ticket.toJSON();
      expect(json.title).toEqual(attrs.title);
      expect(json.price).toEqual(attrs.price);
      expect(json.userId).toEqual(attrs.userId);
      expect(json.artist).toEqual(attrs.artist);
      expect(json.venue).toEqual(attrs.venue);
      expect(json.city).toEqual(attrs.city);
      expect(json.eventType).toEqual(attrs.eventType);
      expect(json.category).toEqual(attrs.category);
      expect(json.seat).toEqual(attrs.seat);
      expect(json.status).toEqual(TicketStatus.AVAILABLE);
    });
  });
});

import { EventType, TicketCategory, TicketStatus } from "@venuepass/common";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Ticket, type TicketDoc } from "../../models/ticket.model";

const createTicket = async (
  overrides: Partial<Parameters<typeof Ticket.build>[0]> = {},
) => {
  const ticket = Ticket.build({
    title: "Default Concert",
    price: 50,
    userId: new mongoose.Types.ObjectId().toHexString(),
    artist: "Default Artist",
    venue: "Default Venue",
    city: "Default City",
    eventDate: new Date("2027-01-01"),
    eventType: EventType.Concert,
    category: TicketCategory.STANDARD,
    seat: "A1",
    quantity: 1,
    ...overrides,
  });
  await ticket.save();
  return ticket;
};

const updateTicketStatus = async (status: TicketStatus) => {
  const newTicket = await createTicket();
  newTicket.set({ status });
  await newTicket.save();
  return newTicket;
};

describe("find all tickets — basic accessibility", () => {
  it("responds with 200 for an unauthenticated request", async () => {
    await request(app).get("/api/tickets").expect(200);
  });

  it("responds with 200 for an authenticated request", async () => {
    const cookie = await global.signin();
    await request(app).get("/api/tickets").set("Cookie", cookie).expect(200);
  });

  it("responds with application/json content-type", async () => {
    const { headers } = await request(app).get("/api/tickets").expect(200);
    expect(headers["content-type"]).toMatch(/application\/json/);
  });

  it("returns an array (even when the collection is empty)", async () => {
    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("find all tickets — unauthenticated: only available tickets returned", () => {
  it("returns only 'available' tickets", async () => {
    await createTicket();
    await updateTicketStatus(TicketStatus.SOLD);
    await updateTicketStatus(TicketStatus.RESERVED);
    await updateTicketStatus(TicketStatus.CANCELLED);

    const { body } = await request(app).get("/api/tickets").expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].status).toBe(TicketStatus.AVAILABLE);
  });

  it("returns an empty array when no tickets are available", async () => {
    await updateTicketStatus(TicketStatus.SOLD);
    await updateTicketStatus(TicketStatus.CANCELLED);

    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body).toHaveLength(0);
  });

  it("returns all available tickets when multiple exist", async () => {
    await createTicket({ title: "Show A" });
    await createTicket({ title: "Show B" });
    await updateTicketStatus(TicketStatus.SOLD);

    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body).toHaveLength(2);
    body.forEach((t: any) => expect(t.status).toBe(TicketStatus.AVAILABLE));
  });

  it("does not return 'sold' tickets", async () => {
    await updateTicketStatus(TicketStatus.SOLD);
    const { body } = await request(app).get("/api/tickets").expect(200);
    const soldTickets = body.filter((t: any) => t.status === TicketStatus.SOLD);
    expect(soldTickets).toHaveLength(0);
  });

  it("does not return 'reserved' tickets", async () => {
    await updateTicketStatus(TicketStatus.RESERVED);
    const { body } = await request(app).get("/api/tickets").expect(200);
    const reserved = body.filter(
      (t: any) => t.status === TicketStatus.RESERVED,
    );
    expect(reserved).toHaveLength(0);
  });

  it("does not return 'cancelled' tickets", async () => {
    await updateTicketStatus(TicketStatus.CANCELLED);
    const { body } = await request(app).get("/api/tickets").expect(200);
    const cancelled = body.filter(
      (t: any) => t.status === TicketStatus.CANCELLED,
    );
    expect(cancelled).toHaveLength(0);
  });
});

describe("find all tickets — authenticated: all tickets returned regardless of status", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns tickets of every status", async () => {
    await createTicket();
    await updateTicketStatus(TicketStatus.SOLD);
    await updateTicketStatus(TicketStatus.RESERVED);
    await updateTicketStatus(TicketStatus.CANCELLED);

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body).toHaveLength(4);
    const statuses = body.map((t: any) => t.status);
    expect(statuses).toContain(TicketStatus.AVAILABLE);
    expect(statuses).toContain(TicketStatus.SOLD);
    expect(statuses).toContain(TicketStatus.RESERVED);
    expect(statuses).toContain(TicketStatus.CANCELLED);
  });

  it("returns an empty array when there are no tickets at all", async () => {
    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);
    expect(body).toHaveLength(0);
  });
});

describe("find all tickets — unauthenticated: public fields only", () => {
  it("returns all expected public fields", async () => {
    await createTicket({
      description: "Great show",
      imageUrl: "https://example.com/img.jpg",
      quantity: 3,
    });

    const { body } = await request(app).get("/api/tickets").expect(200);
    const ticket = body[0];

    const expectedPublicFields = [
      "title",
      "price",
      "artist",
      "venue",
      "city",
      "eventDate",
      "eventType",
      "category",
      "quantity",
      "status",
      "description",
      "imageUrl",
    ];
    expectedPublicFields.forEach((field) => {
      expect(ticket).toHaveProperty(field);
    });
  });

  it("does NOT expose 'seat' to unauthenticated users", async () => {
    await createTicket({ seat: "Z99" });

    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body[0]).not.toHaveProperty("seat");
  });

  it("does NOT expose 'userId' to unauthenticated users", async () => {
    await createTicket();

    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body[0]).not.toHaveProperty("userId");
  });

  it("does not expose internal MongoDB '_id' (only transformed 'id')", async () => {
    await createTicket();
    const { body } = await request(app).get("/api/tickets").expect(200);
    // toJSON transform maps _id -> id
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).not.toHaveProperty("_id");
  });
});

describe("find all tickets — authenticated: private fields included", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 'seat' to authenticated users", async () => {
    await createTicket({ seat: "VIP-Row1" });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body[0]).toHaveProperty("seat", "VIP-Row1");
  });

  it("returns 'userId' to authenticated users", async () => {
    const userId = new (require("mongoose").Types.ObjectId)().toHexString();
    await createTicket({ userId });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body[0]).toHaveProperty("userId", userId);
  });

  it("returns all public fields as well", async () => {
    await createTicket({
      description: "VIP night",
      imageUrl: "https://cdn.x.com/img.png",
    });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const ticket = body[0];
    const expectedFields = [
      "title",
      "price",
      "artist",
      "venue",
      "city",
      "eventDate",
      "eventType",
      "category",
      "quantity",
      "status",
      "description",
      "imageUrl",
      "userId",
      "seat",
    ];
    expectedFields.forEach((f) => expect(ticket).toHaveProperty(f));
  });

  it("does not expose '__v' version key (suppressed by schema)", async () => {
    await createTicket({});
    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);
    expect(body[0]).not.toHaveProperty("__v");
  });
});

describe("find all tickets — data integrity", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns correct field values matching what was saved", async () => {
    const attrs = {
      title: "Jazz Night",
      price: 75.5,
      artist: "Miles Davis Tribute",
      venue: "Blue Note",
      city: "Chicago",
      eventDate: new Date("2027-08-20T19:00:00.000Z"),
      eventType: EventType.Concert,
      category: TicketCategory.VIP,
      seat: "B5",
      quantity: 2,
      description: "A smooth evening of jazz",
      imageUrl: "https://example.com/jazz.jpg",
      status: TicketStatus.AVAILABLE,
    };
    await createTicket(attrs);

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const t = body[0];
    expect(t.title).toBe(attrs.title);
    expect(t.price).toBe(attrs.price);
    expect(t.artist).toBe(attrs.artist);
    expect(t.venue).toBe(attrs.venue);
    expect(t.city).toBe(attrs.city);
    expect(new Date(t.eventDate).toISOString()).toBe(
      attrs.eventDate.toISOString(),
    );
    expect(t.eventType).toBe(attrs.eventType);
    expect(t.category).toBe(attrs.category);
    expect(t.seat).toBe(attrs.seat);
    expect(t.quantity).toBe(attrs.quantity);
    expect(t.description).toBe(attrs.description);
    expect(t.imageUrl).toBe(attrs.imageUrl);
    expect(t.status).toBe(attrs.status);
  });

  it("returns the correct count of documents in the collection", async () => {
    await createTicket({ title: "Show 1" });
    await createTicket({ title: "Show 2" });
    await createTicket({ title: "Show 3" });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body).toHaveLength(3);
  });

  it("each returned ticket has a unique id", async () => {
    await createTicket({ title: "Show A" });
    await createTicket({ title: "Show B" });
    await createTicket({ title: "Show C" });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const ids = body.map((t: any) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("returns tickets across all valid eventType enum values", async () => {
    const eventTypes = Object.values(EventType);
    for (const eventType of eventTypes) {
      await createTicket({ eventType });
    }

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const returnedTypes = body.map((t: any) => t.eventType);
    eventTypes.forEach((type) => expect(returnedTypes).toContain(type));
  });

  it("returns tickets across all valid category enum values", async () => {
    const categories = Object.values(TicketCategory);
    for (const category of categories) {
      await createTicket({ category });
    }

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const returnedCats = body.map((t: any) => t.category);
    categories.forEach((cat) => expect(returnedCats).toContain(cat));
  });

  it("returns the default status of 'available' when no status was set", async () => {
    const ticket = Ticket.build({
      title: "Implicit Available",
      price: 20,
      userId: new (require("mongoose").Types.ObjectId)().toHexString(),
      artist: "X",
      venue: "Y",
      city: "Z",
      eventDate: new Date("2027-03-01"),
      eventType: EventType.Sports,
      category: TicketCategory.STANDARD,
      seat: "C3",
    });
    await ticket.save();

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const saved = body.find((t: any) => t.title === "Implicit Available");
    expect(saved?.status).toBe(TicketStatus.AVAILABLE);
  });

  it("returns the default quantity of 1 when no quantity was provided", async () => {
    const ticket = Ticket.build({
      title: "No Qty Ticket",
      price: 30,
      userId: new (require("mongoose").Types.ObjectId)().toHexString(),
      artist: "A",
      venue: "B",
      city: "C",
      eventDate: new Date("2027-04-01"),
      eventType: EventType.Comedy,
      category: TicketCategory.BOX,
      seat: "D4",
    });
    await ticket.save();

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const saved = body.find((t: any) => t.title === "No Qty Ticket");
    expect(saved?.quantity).toBe(1);
  });
});

describe("find all tickets — auth state comparison", () => {
  it("unauthenticated gets fewer tickets than authenticated when non-available tickets exist", async () => {
    await createTicket();
    await updateTicketStatus(TicketStatus.SOLD);
    await updateTicketStatus(TicketStatus.RESERVED);

    const cookie = await global.signin();

    const unauthRes = await request(app).get("/api/tickets").expect(200);
    const authRes = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(unauthRes.body.length).toBeLessThan(authRes.body.length);
    expect(unauthRes.body).toHaveLength(1);
    expect(authRes.body).toHaveLength(3);
  });

  it("both auth states see the same count when all tickets are available", async () => {
    await createTicket({ title: "Tic1" });
    await createTicket({ title: "Tic2" });

    const cookie = await global.signin();

    const unauthRes = await request(app).get("/api/tickets").expect(200);
    const authRes = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(unauthRes.body).toHaveLength(2);
    expect(authRes.body).toHaveLength(2);
  });

  it("authenticated response contains 'seat' that unauthenticated response withholds", async () => {
    await createTicket({ seat: "SECRET-SEAT" });

    const cookie = await global.signin();

    const unauthTicket = (await request(app).get("/api/tickets").expect(200))
      .body[0];
    const authTicket = (
      await request(app).get("/api/tickets").set("Cookie", cookie).expect(200)
    ).body[0];

    expect(unauthTicket).not.toHaveProperty("seat");
    expect(authTicket).toHaveProperty("seat", "SECRET-SEAT");
  });

  it("authenticated response contains 'userId' that unauthenticated response withholds", async () => {
    const userId = new (require("mongoose").Types.ObjectId)().toHexString();
    await createTicket({ userId });

    const cookie = await global.signin();

    const unauthTicket = (await request(app).get("/api/tickets").expect(200))
      .body[0];
    const authTicket = (
      await request(app).get("/api/tickets").set("Cookie", cookie).expect(200)
    ).body[0];

    expect(unauthTicket).not.toHaveProperty("userId");
    expect(authTicket).toHaveProperty("userId", userId);
  });
});

describe("GET /api/tickets — empty collection", () => {
  it("unauthenticated — returns 200 with empty array (not 404)", async () => {
    const { body, status } = await request(app).get("/api/tickets");
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it("authenticated — returns 200 with empty array (not 404)", async () => {
    const cookie = await global.signin();
    const { body, status } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie);
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });
});

describe("GET /api/tickets — scale", () => {
  beforeEach(async () => {
    const tickets = Array.from({ length: 50 }, (_, i) => {
      const ticket = Ticket.build({
        title: `Ticket ${i}`,
        price: 10 + i,
        userId: new mongoose.Types.ObjectId().toHexString(),
        artist: `Artist ${i}`,
        venue: `Venue ${i}`,
        city: `City ${i}`,
        eventDate: new Date("2028-01-01"),
        eventType: EventType.Festival,
        category: TicketCategory.STANDARD,
        seat: `S${i}`,
      });
      if (i % 2 === 0) {
        ticket.set({ status: TicketStatus.SOLD });
      }
      return ticket;
    });
    await Promise.all(tickets.map((t) => t.save()));
  });

  it("authenticated — returns all 50 tickets", async () => {
    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", await global.signin())
      .expect(200);
    expect(body).toHaveLength(50);
  });

  it("unauthenticated — returns only the 25 available tickets", async () => {
    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body).toHaveLength(25);
    body.forEach((t: any) => expect(t.status).toBe(TicketStatus.AVAILABLE));
  });
});

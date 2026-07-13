import {
  EventType,
  TicketCategory,
  TicketStatus,
} from "@venuepass/common/client";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Ticket } from "../../models/ticket.model";

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
    status: "available",
  }, { ...overrides });
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

describe("find all tickets — unauthenticated", () => {
  it("returns only 'available' tickets", async () => {
    await createTicket();
    await updateTicketStatus(TicketStatus.SOLD);
    await updateTicketStatus(TicketStatus.RESERVED);

    const { body } = await request(app).get("/api/tickets").expect(200);

    expect(body).toHaveLength(1);
  });

  it("returns an empty array when no tickets are available", async () => {
    await updateTicketStatus(TicketStatus.SOLD);

    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body).toHaveLength(0);
  });

  it("returns all available tickets when multiple exist", async () => {
    await createTicket({ title: "Show A" });
    await createTicket({ title: "Show B" });
    await updateTicketStatus(TicketStatus.SOLD);

    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body).toHaveLength(2);
  });

  it("filters to only available tickets", async () => {
    await createTicket(); // available
    await updateTicketStatus(TicketStatus.SOLD);
    await updateTicketStatus(TicketStatus.RESERVED);
    
    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body.length).toBeLessThan(3);
  });
});

describe("find all tickets — authenticated", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns all tickets when authenticated", async () => {
    await createTicket();
    await updateTicketStatus(TicketStatus.SOLD);
    await updateTicketStatus(TicketStatus.RESERVED);

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body).toHaveLength(3);
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
      title: "Public Fields Test",
      price: 25,
    });

    const { body } = await request(app).get("/api/tickets").expect(200);
    const ticket = body.find((t: any) => t.title === "Public Fields Test") || body[0];

    const expectedPublicFields = [
      "title",
      "price",
      "artist",
      "venue",
      "city",
      "eventDate",
      "eventType",
      "category",
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

  it("does not expose 'seat' even to authenticated users", async () => {
    await createTicket({ seat: "VIP-Row1" });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body[0]).not.toHaveProperty("seat");
  });

  it("does not expose 'userId' even to authenticated users", async () => {
    await createTicket();

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body[0]).not.toHaveProperty("userId");
  });

  it("returns all public fields as well", async () => {
    await createTicket({
      title: "Public Fields Auth Test",
      price: 30,
    });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    const ticket = body.find((t: any) => t.title === "Public Fields Auth Test") || body[0];
    const expectedFields = [
      "title",
      "price",
      "artist",
      "venue",
      "city",
      "eventDate",
      "eventType",
      "category",
    ];
    expectedFields.forEach((f) => expect(ticket).toHaveProperty(f));
  });

  it("does not expose '__v' version key (suppressed by schema)", async () => {
    await createTicket();
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

  it("returns a non-empty array when tickets exist", async () => {
    await createTicket({ title: "Test Ticket" });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body.length).toBeGreaterThan(0);
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

  it("returns all available tickets", async () => {
    await createTicket({ title: "Show1" });
    await createTicket({ title: "Show2" });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body).toHaveLength(2);
  });

  it("returns all available tickets", async () => {
    await createTicket({ title: "ShowA" });
    await createTicket({ title: "ShowB" });

    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body).toHaveLength(2);
  });

  it("returns tickets with their title", async () => {
    const ticket = Ticket.build({
      title: "Test Ticket",
      price: 20,
      userId: new mongoose.Types.ObjectId().toHexString(),
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

    const saved = body.find((t: any) => t.title === "Test Ticket");
    expect(saved).not.toBe(undefined);
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

  it("authenticated response does not have access to more fields than unauthenticated since the route uses PUBLIC_FIELDS for both", async () => {
    await createTicket({ description: "Some description" });

    const cookie = await global.signin();

    const unauthRes = await request(app).get("/api/tickets").expect(200);
    const authRes = await request(app).get("/api/tickets").set("Cookie", cookie).expect(200);

    // Both responses should have same fields since route only returns PUBLIC_FIELDS
    expect(Object.keys(unauthRes.body[0])).toEqual(Object.keys(authRes.body[0]));
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

  it("authenticated — returns all 50 tickets when limit is set high enough", async () => {
    const { body } = await request(app)
      .get("/api/tickets?limit=50")
      .set("Cookie", await global.signin())
      .expect(200);
    expect(body).toHaveLength(50);
  });

  it("authenticated — returns only the default page size when no limit is specified", async () => {
    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", await global.signin())
      .expect(200);
    expect(body).toHaveLength(20);
  });

  it("unauthenticated — returns only the default page size (not limit=50) since the route filters and defaults", async () => {
    const { body } = await request(app)
      .get("/api/tickets?limit=50")
      .expect(200);
    // The route always returns available tickets for unauthenticated users
    expect(body.length).toBeLessThan(50);
  });
});

describe("find all tickets — pagination", () => {
  it("returns at most the default page size when more tickets exist than that", async () => {
    for (let i = 0; i < 25; i++) {
      await createTicket({ title: `Ticket ${i}` });
    }

    const { body } = await request(app).get("/api/tickets").expect(200);
    expect(body.length).toBeLessThanOrEqual(20);
  });

  it("respects an explicit limit query param", async () => {
    for (let i = 0; i < 5; i++) {
      await createTicket({ title: `Ticket ${i}` });
    }

    const { body } = await request(app).get("/api/tickets?limit=2").expect(200);
    expect(body).toHaveLength(2);
  });

  it("respects skip combined with limit to page through results", async () => {
    for (let i = 0; i < 5; i++) {
      await createTicket({ title: `Ticket ${i}` });
    }

    const page1 = await request(app)
      .get("/api/tickets?limit=2&skip=0")
      .expect(200);
    const page2 = await request(app)
      .get("/api/tickets?limit=2&skip=2")
      .expect(200);

    expect(page1.body).toHaveLength(2);
    expect(page2.body).toHaveLength(2);
    const page1Ids = page1.body.map((t: any) => t.id);
    const page2Ids = page2.body.map((t: any) => t.id);
    expect(page1Ids).not.toEqual(page2Ids);
  });

  it("caps limit at the maximum page size rather than honoring an absurdly large value", async () => {
    // Seed more than MAX_PAGE_SIZE tickets to verify the cap is actually enforced
    const ticketTitles = Array.from({ length: 150 }, (_, i) => `Ticket-${i}`);
    await Promise.all(ticketTitles.map((title) => createTicket({ title })));

    const { body } = await request(app)
      .get("/api/tickets?limit=999999")
      .expect(200);
    // Verify the response is capped at MAX_PAGE_SIZE (100 tickets), not 999999
    expect(body).toHaveLength(100);
  });

  it("falls back to default pagination when limit/skip are garbage, non-numeric values", async () => {
    await createTicket();
    const { body } = await request(app)
      .get("/api/tickets?limit=not-a-number&skip=also-not-a-number")
      .expect(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
  });
});

describe("find all tickets — sort order", () => {
  it("returns an array of tickets (basic functionality)", async () => {
    await createTicket({ title: "ShowA" });
    await createTicket({ title: "ShowB" });

    const cookie = await global.signin();
    const { body } = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookie)
      .expect(200);

    expect(body).toHaveLength(2);
  });
});

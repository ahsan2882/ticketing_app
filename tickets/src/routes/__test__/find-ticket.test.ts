import {
  EventType,
  TicketCategory,
  TicketStatus,
} from "@venuepass/common/client";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Ticket } from "../../models/ticket.model";

const buildTicket = async (
  overrides: Partial<Parameters<typeof Ticket.build>[0]> = {},
) => {
  const ticket = Ticket.build({
    title: "Taylor Swift Concert",
    price: 250,
    userId: new mongoose.Types.ObjectId().toHexString(),
    artist: "Taylor Swift",
    venue: "National Stadium",
    city: "Karachi",
    eventDate: new Date("2030-12-25T20:00:00.000Z"),
    eventType: EventType.Comedy,
    category: TicketCategory.VIP,
    seat: "A-12",
    description: "Front row VIP ticket",
    imageUrl: "https://example.com/ticket.jpg",
    ...overrides,
  });

  await ticket.save();
  return ticket;
};

describe("find ticket - malformed ticket id handling", () => {
  it("returns 400 when id is not a valid ObjectId", async () => {
    await request(app).get("/api/tickets/not-valid-id").send().expect(400);
  });

  it("returns 400 when id is an empty-ish invalid string", async () => {
    await request(app).get("/api/tickets/abc").send().expect(400);
  });

  it("returns 400 when id contains special characters", async () => {
    await request(app).get("/api/tickets/@@@###").send().expect(400);
  });

  it("returns 400 when id is too short to be an ObjectId", async () => {
    await request(app).get("/api/tickets/123").send().expect(400);
  });

  it("returns 400 when id is too long to be an ObjectId", async () => {
    await request(app)
      .get("/api/tickets/507f1f77bcf86cd799439011123")
      .send()
      .expect(400);
  });
});

describe("find ticket - not found behavior", () => {
  it("returns 404 when id is a valid ObjectId but no ticket exists", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();

    await request(app).get(`/api/tickets/${id}`).send().expect(404);
  });

  it("returns 404 for a valid ObjectId instance that belongs to no ticket", async () => {
    const id = new mongoose.Types.ObjectId();

    await request(app).get(`/api/tickets/${id}`).send().expect(404);
  });

  it("returns 404 even when authenticated, if the ticket does not exist", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .get(`/api/tickets/${id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(404);
  });
});

describe("find ticket - public unauthenticated response", () => {
  it("returns 200 when ticket exists", async () => {
    const ticket = await buildTicket();

    await request(app).get(`/api/tickets/${ticket.id}`).send().expect(200);
  });

  it("returns public ticket fields", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.title).toEqual("Taylor Swift Concert");
    expect(response.body.price).toEqual(250);
    expect(response.body.artist).toEqual("Taylor Swift");
    expect(response.body.venue).toEqual("National Stadium");
    expect(response.body.city).toEqual("Karachi");
    expect(response.body.eventType).toEqual(EventType.Comedy);
    expect(response.body.category).toEqual(TicketCategory.VIP);
    expect(response.body.status).toEqual(TicketStatus.AVAILABLE);
    expect(response.body.description).toEqual("Front row VIP ticket");
    expect(response.body.imageUrl).toEqual("https://example.com/ticket.jpg");
  });

  it("returns ticket id as id", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.id).toEqual(ticket.id);
  });

  it("does not expose userId to unauthenticated users", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.userId).toBeUndefined();
  });

  it("does not expose seat to unauthenticated users", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.seat).toBeUndefined();
  });

  it("does not expose mongoose _id", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body._id).toBeUndefined();
  });

  it("does not expose __v", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.__v).toBeUndefined();
  });

  it("returns eventDate as an ISO string", async () => {
    const ticket = await buildTicket({
      eventDate: new Date("2031-01-10T18:30:00.000Z"),
    });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.eventDate).toEqual("2031-01-10T18:30:00.000Z");
  });
});

describe("find ticket - authenticated response", () => {
  it("returns 200 for authenticated user", async () => {
    const ticket = await buildTicket();

    await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);
  });

  it("exposes userId to authenticated users", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(response.body.userId).toEqual(userId);
  });

  it("exposes seat to authenticated users", async () => {
    const ticket = await buildTicket({ seat: "B-44" });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(response.body.seat).toEqual("B-44");
  });

  it("returns both public and private fields to authenticated users", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();

    const ticket = await buildTicket({
      userId,
      seat: "C-10",
    });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(response.body).toMatchObject({
      id: ticket.id,
      title: "Taylor Swift Concert",
      price: 250,
      artist: "Taylor Swift",
      venue: "National Stadium",
      city: "Karachi",
      eventType: EventType.Comedy,
      category: TicketCategory.VIP,
      status: TicketStatus.AVAILABLE,
      description: "Front row VIP ticket",
      imageUrl: "https://example.com/ticket.jpg",
      userId,
      seat: "C-10",
    });
  });

  it("does not require the authenticated user to own the ticket", async () => {
    const ownerId = new mongoose.Types.ObjectId().toHexString();

    const ticket = await buildTicket({ userId: ownerId });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(response.body.userId).toEqual(ownerId);
  });

  it("does not expose mongoose _id to authenticated users", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(response.body._id).toBeUndefined();
  });

  it("does not expose __v to authenticated users", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(response.body.__v).toBeUndefined();
  });
});

describe("find ticket - field projection behavior", () => {
  it("does not return fields outside the public field set for unauthenticated users", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        "id",
        "title",
        "price",
        "artist",
        "venue",
        "city",
        "eventDate",
        "eventType",
        "category",
        "status",
        "description",
        "imageUrl",
      ].sort(),
    );
  });

  it("does not return fields outside the private field set for authenticated users", async () => {
    const ticket = await buildTicket();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        "id",
        "title",
        "price",
        "artist",
        "venue",
        "city",
        "eventDate",
        "eventType",
        "category",
        "status",
        "description",
        "imageUrl",
        "userId",
        "seat",
      ].sort(),
    );
  });

  it("returns description when it exists", async () => {
    const ticket = await buildTicket({
      description: "This is a detailed description",
    });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.description).toEqual("This is a detailed description");
  });

  it("returns imageUrl when it exists", async () => {
    const ticket = await buildTicket({
      imageUrl: "https://example.com/custom-image.png",
    });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.imageUrl).toEqual(
      "https://example.com/custom-image.png",
    );
  });
});

describe("find ticket - ticket data variations", () => {
  it("returns default status of AVAILABLE when status is not provided", async () => {
    const ticket = Ticket.build({
      title: "Comedy Night",
      price: 50,
      userId: new mongoose.Types.ObjectId().toHexString(),
      artist: "Ali Gul Pir",
      venue: "Arts Council",
      city: "Karachi",
      eventDate: new Date("2032-02-01T19:00:00.000Z"),
      eventType: EventType.Comedy,
      category: TicketCategory.STANDARD,
      seat: "G-1",
    });

    await ticket.save();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.status).toEqual(TicketStatus.AVAILABLE);
  });

  it("returns SOLD status correctly", async () => {
    const ticket = await buildTicket();
    ticket.set({ status: TicketStatus.SOLD });
    await ticket.save();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.status).toEqual(TicketStatus.SOLD);
  });

  it("returns RESERVED status correctly", async () => {
    const ticket = await buildTicket();
    ticket.set({ status: TicketStatus.RESERVED });
    await ticket.save();
    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.status).toEqual(TicketStatus.RESERVED);
  });

  it("returns Sports event type correctly", async () => {
    const ticket = await buildTicket({ eventType: EventType.Sports });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.eventType).toEqual(EventType.Sports);
  });

  it("returns Theatre event type correctly", async () => {
    const ticket = await buildTicket({ eventType: EventType.Theatre });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.eventType).toEqual(EventType.Theatre);
  });

  it("returns VIP category correctly", async () => {
    const ticket = await buildTicket({ category: TicketCategory.VIP });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.category).toEqual(TicketCategory.VIP);
  });

  it("returns BALCONY category correctly", async () => {
    const ticket = await buildTicket({ category: TicketCategory.BALCONY });

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(response.body.category).toEqual(TicketCategory.BALCONY);
  });
});

describe("find ticket - multiple tickets", () => {
  it("returns the requested ticket, not another ticket", async () => {
    const firstTicket = await buildTicket({
      title: "First Ticket",
      price: 100,
      seat: "A-1",
    });

    const secondTicket = await buildTicket({
      title: "Second Ticket",
      price: 200,
      seat: "B-1",
    });

    const response = await request(app)
      .get(`/api/tickets/${secondTicket.id}`)
      .set("Cookie", await global.signin())
      .send()
      .expect(200);

    expect(response.body.id).toEqual(secondTicket.id);
    expect(response.body.title).toEqual("Second Ticket");
    expect(response.body.price).toEqual(200);
    expect(response.body.seat).toEqual("B-1");

    expect(response.body.id).not.toEqual(firstTicket.id);
    expect(response.body.title).not.toEqual("First Ticket");
  });

  it("keeps public projection consistent across different tickets", async () => {
    const firstTicket = await buildTicket({
      title: "Public Ticket One",
      seat: "A-1",
    });

    const secondTicket = await buildTicket({
      title: "Public Ticket Two",
      seat: "B-1",
    });

    const firstResponse = await request(app)
      .get(`/api/tickets/${firstTicket.id}`)
      .send()
      .expect(200);

    const secondResponse = await request(app)
      .get(`/api/tickets/${secondTicket.id}`)
      .send()
      .expect(200);

    expect(firstResponse.body.seat).toBeUndefined();
    expect(firstResponse.body.userId).toBeUndefined();

    expect(secondResponse.body.seat).toBeUndefined();
    expect(secondResponse.body.userId).toBeUndefined();
  });
});

describe("find ticket - cross-route consistency with list endpoint", () => {
  it("a SOLD ticket is excluded from the unauthenticated list but still fetchable directly by id", async () => {
    const ticket = await buildTicket();
    ticket.set({ status: TicketStatus.SOLD });
    await ticket.save();

    const listResponse = await request(app)
      .get("/api/tickets")
      .send()
      .expect(200);
    const idsInList = listResponse.body.map((t: any) => t.id);
    expect(idsInList).not.toContain(ticket.id);

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);
    expect(detailResponse.body.id).toEqual(ticket.id);
    expect(detailResponse.body.status).toEqual(TicketStatus.SOLD);
  });
});

describe("find ticket - field projection on non-available tickets", () => {
  it("returns the same public field set for a SOLD ticket as for an AVAILABLE one", async () => {
    const ticket = await buildTicket();
    ticket.set({ status: TicketStatus.SOLD });
    await ticket.save();

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .send()
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        "id",
        "title",
        "price",
        "artist",
        "venue",
        "city",
        "eventDate",
        "eventType",
        "category",
        "status",
        "description",
        "imageUrl",
      ].sort(),
    );
  });
});

describe("find ticket - id case sensitivity", () => {
  it("finds the ticket when the id is supplied in uppercase hex", async () => {
    const ticket = await buildTicket();
    const uppercased = ticket.id.toUpperCase();

    const response = await request(app)
      .get(`/api/tickets/${uppercased}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.id).toEqual(ticket.id);
  });
});

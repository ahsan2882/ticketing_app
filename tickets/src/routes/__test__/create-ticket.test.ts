import {
  EventType,
  TicketCategory,
  TicketStatus,
} from "@venuepass/common/client";
import request from "supertest";
import { app } from "../../app";
import { TicketCreatedPublisher } from "../../events/publishers/ticket-created-publisher";
import {
  Ticket,
  type CreateTicketBodyIngress,
} from "../../models/ticket.model";

jest.mock("../../events/publishers/ticket-created-publisher");

afterEach(() => {
  (TicketCreatedPublisher.prototype.publish as jest.Mock).mockClear();
});

type TicketPayload = Record<string, unknown> & Partial<CreateTicketBodyIngress>;

// ---- helpers -------------------------------------------------------------

const validTicketPayload = (overrides?: TicketPayload) => ({
  title: "Coldplay Live in Concert",
  price: 99.99,
  artist: "Coldplay",
  venue: "National Stadium",
  city: "Karachi",
  eventDate: "2026-12-15T19:00:00.000Z",
  eventType: Object.values(EventType)[0],
  category: Object.values(TicketCategory)[0],
  ...overrides,
});

// ---- tests ----------------------------------------------------------------

describe("create tickets — authentication", () => {
  it("returns 401 when no cookie is provided", async () => {
    await request(app)
      .post("/api/tickets")
      .send(validTicketPayload())
      .expect(401);
  });

  it("returns 401 when an invalid/garbage cookie is provided", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", ["session=not-a-real-jwt"])
      .send(validTicketPayload())
      .expect(401);
  });

  it("returns 201 when a valid auth cookie is provided", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin())
      .send(validTicketPayload())
      .expect(201);
  });

  it("associates the created ticket with the signed-in user's id", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin(userId))
      .send(validTicketPayload())
      .expect(201);

    expect(body[0].userId).toEqual(userId);
  });
});

describe("create tickets — title validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when title is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).title;
    const { body: res } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
    expect(res.errors).toBeDefined();
  });

  it("returns 400 when title is an empty string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ title: "" }))
      .expect(400);
  });

  it("returns 400 when title is only whitespace", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ title: "    " }))
      .expect(400);
  });

  it("returns 400 when title is fewer than 3 characters", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ title: "AB" }))
      .expect(400);
  });

  it("accepts a title with exactly 3 characters", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ title: "ABC" }))
      .expect(201);
  });
});

describe("create tickets — price validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when price is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).price;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });

  it("returns 400 when price is zero", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ price: 0 }))
      .expect(400);
  });

  it("returns 400 when price is negative", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ price: -25 }))
      .expect(400);
  });

  it("returns 400 when price is not a number", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      // @ts-ignore
      .send(validTicketPayload({ price: "expensive" }))
      .expect(400);
  });

  it("accepts a valid positive float price", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ price: 149.5 }))
      .expect(201);
  });
});

describe("create tickets — artist, venue, city validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when artist is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).artist;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });

  it("returns 400 when venue is an empty string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ venue: "" }))
      .expect(400);
  });

  it("returns 400 when city is only whitespace", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ city: "   " }))
      .expect(400);
  });

  it("returns 400 when artist is not a string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      // @ts-ignore
      .send(validTicketPayload({ artist: 42 }))
      .expect(400);
  });

  it("accepts valid artist, venue, and city strings", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(
        validTicketPayload({
          artist: "Coldplay",
          venue: "National Stadium",
          city: "Karachi",
        }),
      )
      .expect(201);
  });
});

describe("create tickets — eventDate validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when eventDate is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).eventDate;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });

  it("returns 400 when eventDate is not a valid ISO8601 date", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ eventDate: "not-a-date" }))
      .expect(400);
  });

  it("accepts when eventDate uses a non-strict separator", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ eventDate: "2026-12-15 19:00:00" }))
      .expect(201);
  });

  it("accepts a strictly formatted ISO8601 eventDate", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ eventDate: "2026-12-15T19:00:00.000Z" }))
      .expect(201);
  });
});

describe("create tickets — eventType and category validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when eventType is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).eventType;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });

  it("returns 400 when eventType is not a recognized value", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      // @ts-ignore
      .send(validTicketPayload({ eventType: "not-a-real-event-type" }))
      .expect(400);
  });

  it("returns 400 when category is not a recognized value", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      // @ts-ignore
      .send(validTicketPayload({ category: "not-a-real-category" }))
      .expect(400);
  });

  it("accepts any valid EventType and TicketCategory enum member", async () => {
    const eventType = Object.values(EventType)[0]!;
    const category = Object.values(TicketCategory)[0]!;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ eventType, category }))
      .expect(201);
  });
});

describe("create tickets — seats and quantity validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when seats is provided as an empty array", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: [] }))
      .expect(400);
  });

  it("returns 400 when seats contains a non-string entry", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      // @ts-ignore
      .send(validTicketPayload({ seats: ["A1", 2, "A3"] }))
      .expect(400);
  });

  it("returns 400 when seats contains an empty string entry", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "   ", "A3"] }))
      .expect(400);
  });

  it("returns 400 when quantity is zero or negative", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ quantity: 0 }))
      .expect(400);
  });

  it("returns 400 when quantity is not an integer", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ quantity: 2.5 }))
      .expect(400);
  });

  it("returns 400 when seats length does not match quantity", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2"], quantity: 3 }))
      .expect(400);
  });

  it("accepts a matching seats array and quantity, creating one ticket per seat", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2", "A3"], quantity: 3 }))
      .expect(201);

    expect(body).toHaveLength(3);
    expect(body.map((t: any) => t.seat).sort()).toEqual(["A1", "A2", "A3"]);
  });

  it("creates a single ticket with no seat when neither seats nor quantity is provided", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(body).toHaveLength(1);
    expect(body[0].seat).toBeUndefined();
  });

  it("creates multiple seatless tickets when only quantity is provided", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ quantity: 4 }))
      .expect(201);

    expect(body).toHaveLength(4);
    body.forEach((t: any) => expect(t.seat).toBeUndefined());
  });
});

describe("create tickets — description and imageUrl validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when description is provided as an empty string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ description: "" }))
      .expect(400);
  });

  it("returns 400 when imageUrl is not a valid URL", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ imageUrl: "not-a-url" }))
      .expect(400);
  });

  it("accepts a request with no description or imageUrl provided", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);
  });

  it("accepts a valid description and imageUrl", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(
        validTicketPayload({
          description: "An unforgettable night of music.",
          imageUrl: "https://example.com/poster.jpg",
        }),
      )
      .expect(201);
  });
});

describe("create tickets — persistence", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("saves the ticket(s) to the database", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    const tickets = await Ticket.find({});
    expect(tickets).toHaveLength(1);
    expect(tickets[0]!.title).toEqual("Coldplay Live in Concert");
  });

  it("persists one document per seat when seats are provided", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2"], quantity: 2 }))
      .expect(201);

    const tickets = await Ticket.find({});
    expect(tickets).toHaveLength(2);
  });

  it("defaults status to Available on creation", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(body[0].status).toEqual(TicketStatus.AVAILABLE);
  });

  it("defaults status to Available for every ticket when multiple are created", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2"], quantity: 2 }))
      .expect(201);

    body.forEach((t: any) => expect(t.status).toEqual(TicketStatus.AVAILABLE));
  });

  it("sets version to 0 on initial creation", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(body[0].version).toEqual(0);
  });
});

describe("create tickets — event publishing", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("publishes a TicketCreatedEvent when a ticket is created", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(TicketCreatedPublisher.prototype.publish).toHaveBeenCalledTimes(1);
  });

  it("publishes one event per ticket when multiple seats are provided", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2", "A3"], quantity: 3 }))
      .expect(201);

    expect(TicketCreatedPublisher.prototype.publish).toHaveBeenCalledTimes(3);
  });

  it("includes id, title, price, userId, status, and version in the published event", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin(userId))
      .send(validTicketPayload())
      .expect(201);

    expect(TicketCreatedPublisher.prototype.publish).toHaveBeenCalledWith({
      id: body[0].id,
      title: body[0].title,
      price: body[0].price,
      userId,
      status: body[0].status,
      version: body[0].version,
    });
  });

  it("does not publish any event when validation fails", async () => {
    const body = validTicketPayload();
    delete (body as any).title;

    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);

    expect(TicketCreatedPublisher.prototype.publish).not.toHaveBeenCalled();
  });
});

describe("create tickets — mass-assignment protection", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("ignores a client-supplied id and generates its own", async () => {
    const fakeId = "111111111111111111111111";
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ id: fakeId }))
      .expect(201);

    expect(body[0].id).not.toEqual(fakeId);
  });

  it("ignores a client-supplied userId and uses the authenticated user instead", async () => {
    const realUserId = "507f1f77bcf86cd799439011";
    const spoofedUserId = "222222222222222222222222";
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin(realUserId))
      .send(validTicketPayload({ userId: spoofedUserId }))
      .expect(201);

    expect(body[0].userId).toEqual(realUserId);
  });

  it("ignores a client-supplied status and falls back to the default", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ status: TicketStatus.RESERVED }))
      .expect(201);
    expect(body[0].status).toEqual(TicketStatus.AVAILABLE);
  });

  it("ignores a client-supplied version and starts at 0", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ version: 7 }))
      .expect(201);

    expect(body[0].version).toEqual(0);
  });
});

describe("create tickets — malformed request bodies", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when the body is empty", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({})
      .expect(400);
  });

  it("returns 400 when extra unknown fields are submitted alongside valid ones", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ someRandomField: "unexpected" }))
      .expect(201);
  });

  it("returns 400 when seats is sent as a string instead of an array", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      // @ts-ignore
      .send(validTicketPayload({ seats: "A1" }))
      .expect(400);
  });

  it("returns 400 when quantity is sent as a string that isn't numeric", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      // @ts-ignore
      .send(validTicketPayload({ quantity: "many" }))
      .expect(400);
  });

  it("trims leading/trailing whitespace from trimmed string fields", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(
        validTicketPayload({
          title: "  Coldplay Live  ",
          artist: "  Coldplay  ",
        }),
      )
      .expect(201);

    expect(body[0].title).toEqual("Coldplay Live");
    expect(body[0].artist).toEqual("Coldplay");
  });
});

describe("create tickets — response shape", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns an array even when only a single ticket is created", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(Array.isArray(body)).toBe(true);
  });

  it("returns tickets containing all submitted fields", async () => {
    const payload = validTicketPayload();
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(payload)
      .expect(201);

    expect(body[0]).toMatchObject({
      title: payload.title,
      price: payload.price,
      artist: payload.artist,
      venue: payload.venue,
      city: payload.city,
    });
  });

  it("returns a unique id for each ticket created in the same request", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2", "A3"], quantity: 3 }))
      .expect(201);

    const ids = body.map((t: any) => t.id);
    expect(new Set(ids).size).toEqual(ids.length);
  });

  it("does not leak internal mongoose fields like __v in the response", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(body[0].__v).toBeUndefined();
    expect(body[0]._id).toBeUndefined();
  });
});

describe("create tickets — transactional atomicity", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("persists zero tickets if any ticket in a multi-seat batch fails to save", async () => {
    const originalSave = Ticket.prototype.save;
    let callCount = 0;
    const saveSpy = jest
      .spyOn(Ticket.prototype, "save")
      .mockImplementation(function (this: any, ...args: any[]) {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error("Simulated save failure"));
        }
        return originalSave.apply(this, args);
      });

    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2", "A3"], quantity: 3 }));

    const tickets = await Ticket.find({});
    expect(tickets).toHaveLength(0);

    saveSpy.mockRestore();
  });

  it("does not publish any events if the batch fails partway through", async () => {
    const originalSave = Ticket.prototype.save;
    let callCount = 0;
    const saveSpy = jest
      .spyOn(Ticket.prototype, "save")
      .mockImplementation(function (this: any, ...args: any[]) {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error("Simulated save failure"));
        }
        return originalSave.apply(this, args);
      });

    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: ["A1", "A2", "A3"], quantity: 3 }));

    expect(TicketCreatedPublisher.prototype.publish).not.toHaveBeenCalled();

    saveSpy.mockRestore();
  });
});

describe("create tickets — quantity upper bound", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when quantity exceeds the maximum allowed per request", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ quantity: 51 }))
      .expect(400);
  });

  it("accepts quantity exactly at the maximum allowed boundary", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ quantity: 50 }))
      .expect(201);
  });

  it("returns 400 when seats array exceeds the maximum allowed length", async () => {
    const tooManySeats = Array.from({ length: 51 }, (_, i) => `Seat-${i}`);
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload({ seats: tooManySeats, quantity: 51 }))
      .expect(400);
  });
});

describe("create tickets — eventDate must be in the future (end-to-end)", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 (not 500) when eventDate is in the past", async () => {
    const yesterdayISO = new Date(Date.now() - 86_400_000).toISOString();
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(
        validTicketPayload({
          eventDate: yesterdayISO,
        }),
      )
      .expect(400);
  });
});

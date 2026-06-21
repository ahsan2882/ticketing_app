import { EventType, TicketCategory } from "@venuepass/common";
import request from "supertest";
import { app } from "../../app";
import { TicketCreatedPublisher } from "../../events/publishers/ticket-created.publisher";
import { Ticket } from "../../models/ticket.model";

jest.mock("../../events/publishers/ticket-created.publisher");

const validTicketPayload = () => ({
  title: "Rock Night 2026",
  price: 49.99,
  artist: "The Rolling Stones",
  venue: "Madison Square Garden",
  city: "New York",
  eventDate: new Date(Date.now() + 86_400_000), // tomorrow
  eventType: EventType.Concert,
  category: TicketCategory.VIP,
  seat: "A12",
  quantity: 2,
  description: "An unforgettable night of rock.",
  imageUrl: "https://example.com/poster.jpg",
});

describe("create tickets — authentication", () => {
  it("returns 401 when no cookie is provided", async () => {
    await request(app)
      .post("/api/tickets")
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
      .send({ ...validTicketPayload(), title: "" })
      .expect(400);
  });

  it("returns 400 when title is only whitespace", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), title: "   " })
      .expect(400);
  });

  it("returns 400 when title is fewer than 3 characters", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), title: "AB" })
      .expect(400);
  });

  it("returns 400 when title is a number", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), title: 12345 })
      .expect(400);
  });

  it("accepts a title with exactly 3 characters", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), title: "ABC" })
      .expect(201);
  });

  it("accepts a title that exceeds 3 characters", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        ...validTicketPayload(),
        title: "A Very Long Concert Title That Is Fine",
      })
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
      .send({ ...validTicketPayload(), price: 0 })
      .expect(400);
  });

  it("returns 400 when price is negative", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), price: -10 })
      .expect(400);
  });

  it("returns 400 when price is a string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), price: "free" })
      .expect(400);
  });

  it("accepts a positive float price", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), price: 0.01 })
      .expect(201);
  });

  it("accepts a large integer price", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), price: 9999 })
      .expect(201);
  });
});

describe("create tickets — artist validation", () => {
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

  it("returns 400 when artist is an empty string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), artist: "" })
      .expect(400);
  });

  it("returns 400 when artist is only whitespace", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), artist: "   " })
      .expect(400);
  });

  it("accepts a valid artist name", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), artist: "Coldplay" })
      .expect(201);
  });
});

describe("create tickets — venue validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when venue is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).venue;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });

  it("returns 400 when venue is empty", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), venue: "" })
      .expect(400);
  });

  it("accepts a valid venue name", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), venue: "O2 Arena" })
      .expect(201);
  });
});

describe("create tickets — city validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when city is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).city;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });

  it("returns 400 when city is empty", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), city: "" })
      .expect(400);
  });

  it("accepts a valid city", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), city: "London" })
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

  it("returns 400 when eventDate is an arbitrary string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), eventDate: "not-a-date" })
      .expect(400);
  });

  it("returns 400 when eventDate is a number", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), eventDate: 9999999 })
      .expect(400);
  });

  it("accepts a full ISO 8601 date-time string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), eventDate: "2027-06-15T20:00:00.000Z" })
      .expect(201);
  });

  it("accepts a date-only ISO 8601 string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), eventDate: "2027-06-15" })
      .expect(201);
  });
});

describe("create tickets — eventType validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  const validTypes = [
    "concert",
    "sports",
    "theatre",
    "comedy",
    "festival",
    "conference",
  ];
  const invalidTypes = ["gig", "opera", "CONCERT", "Concert", "", "random"];

  validTypes.forEach((type) => {
    it(`accepts eventType "${type}"`, async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ ...validTicketPayload(), eventType: type })
        .expect(201);
    });
  });

  invalidTypes.forEach((type) => {
    it(`returns 400 for eventType "${type}"`, async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ ...validTicketPayload(), eventType: type })
        .expect(400);
    });
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
});

describe("create tickets — category validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  const validCategories = ["GA", "VIP", "floor", "balcony", "box"];
  const invalidCategories = ["vip", "ga", "FLOOR", "suite", "", "premium"];

  validCategories.forEach((cat) => {
    it(`accepts category "${cat}"`, async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ ...validTicketPayload(), category: cat })
        .expect(201);
    });
  });

  invalidCategories.forEach((cat) => {
    it(`returns 400 for category "${cat}"`, async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ ...validTicketPayload(), category: cat })
        .expect(400);
    });
  });

  it("returns 400 when category is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).category;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });
});

describe("create tickets — seat validation", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns 400 when seat is missing", async () => {
    const body = validTicketPayload();
    delete (body as any).seat;
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(body)
      .expect(400);
  });

  it("returns 400 when seat is an empty string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), seat: "" })
      .expect(400);
  });

  it("accepts alphanumeric seat identifiers", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), seat: "Row-B-Seat-22" })
      .expect(201);
  });
});

describe("create tickets — optional fields", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("creates a ticket without optional fields (quantity, description, imageUrl)", async () => {
    const { quantity, description, imageUrl, ...required } =
      validTicketPayload();
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(required)
      .expect(201);
  });

  // quantity
  it("returns 400 when quantity is 0", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), quantity: 0 })
      .expect(400);
  });

  it("returns 400 when quantity is negative", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), quantity: -5 })
      .expect(400);
  });

  it("returns 400 when quantity is a float", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), quantity: 1.5 })
      .expect(400);
  });

  it("accepts quantity of 1", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), quantity: 1 })
      .expect(201);
  });

  it("accepts a large valid quantity", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), quantity: 1000 })
      .expect(201);
  });

  // description
  it("returns 400 when description is an empty string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), description: "" })
      .expect(400);
  });

  it("returns 400 when description is only whitespace", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), description: "   " })
      .expect(400);
  });

  it("accepts a valid description string", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        ...validTicketPayload(),
        description: "Great seats near the stage.",
      })
      .expect(201);
  });

  // imageUrl
  it("returns 400 when imageUrl is not a valid URL", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), imageUrl: "not-a-url" })
      .expect(400);
  });

  it("returns 400 when imageUrl is a relative path", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), imageUrl: "/images/poster.jpg" })
      .expect(400);
  });

  it("accepts a valid http imageUrl", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        ...validTicketPayload(),
        imageUrl: "http://cdn.example.com/img.png",
      })
      .expect(201);
  });

  it("accepts a valid https imageUrl", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        ...validTicketPayload(),
        imageUrl: "https://cdn.example.com/img.png",
      })
      .expect(201);
  });
});

describe("create tickets — multiple validation errors", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns all errors when multiple fields are invalid", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        title: "AB", // too short
        price: -5, // negative
        artist: "", // empty
        venue: "", // empty
        city: "", // empty
        eventDate: "bad", // not ISO
        eventType: "opera", // invalid enum
        category: "suite", // invalid enum
        seat: "", // empty
      })
      .expect(400);

    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe("create tickets — response body", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("returns the created ticket with all submitted fields", async () => {
    const payload = validTicketPayload();
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(payload)
      .expect(201);

    expect(body.title).toBe(payload.title);
    expect(body.price).toBe(payload.price);
    expect(body.artist).toBe(payload.artist);
    expect(body.venue).toBe(payload.venue);
    expect(body.city).toBe(payload.city);
    expect(body.eventType).toBe(payload.eventType);
    expect(body.category).toBe(payload.category);
    expect(body.seat).toBe(payload.seat);
    expect(body.quantity).toBe(payload.quantity);
    expect(body.description).toBe(payload.description);
    expect(body.imageUrl).toBe(payload.imageUrl);
  });

  it("attaches the authenticated user's id to the created ticket", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(body.userId).toBeDefined();
    expect(typeof body.userId).toBe("string");
  });

  it("returns a ticket with a MongoDB id field", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(body.id).toBeDefined();
  });

  it("does not return the __v field (version key)", async () => {
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    // Common Mongoose practice: suppress __v in toJSON
    expect(body.__v).toBeUndefined();
  });
});

describe("create tickets — database persistance", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("persists the ticket to the database", async () => {
    const payload = validTicketPayload();
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(payload)
      .expect(201);

    const id = body.id ?? body._id;
    const saved = await Ticket.findById(id);
    expect(saved).not.toBeNull();
    expect(saved!.title).toBe(payload.title);
    expect(saved!.price).toBe(payload.price);
  });

  it("each request creates a distinct document", async () => {
    const before = await Ticket.countDocuments();
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);
    const after = await Ticket.countDocuments();
    expect(after).toBe(before + 2);
  });
});

describe("create tickets — content type", () => {
  let cookie: string[];
  beforeEach(async () => {
    cookie = await global.signin();
  });

  it("responds with application/json content-type", async () => {
    const { headers } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(validTicketPayload())
      .expect(201);

    expect(headers["content-type"]).toMatch(/application\/json/);
  });
});

describe("create tickets — event publishing", () => {
  let cookie: string[];

  beforeEach(async () => {
    cookie = await global.signin();
    (TicketCreatedPublisher as jest.Mock).mockClear();
  });

  it("publishes a TicketCreated event after a successful save", async () => {
    const payload = validTicketPayload();
    const { body } = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(payload)
      .expect(201);

    expect(TicketCreatedPublisher).toHaveBeenCalledTimes(1);

    const publisherInstance = (TicketCreatedPublisher as jest.Mock).mock
      .instances[0];
    expect(publisherInstance.publish).toHaveBeenCalledTimes(1);
    expect(publisherInstance.publish).toHaveBeenCalledTimes(1);

    const publishedData = publisherInstance.publish.mock.calls[0][0];
    expect(publishedData).toMatchObject({
      id: body.id,
      title: payload.title,
      price: payload.price,
      userId: body.userId,
      artist: payload.artist,
      venue: payload.venue,
      city: payload.city,
      eventType: payload.eventType,
      category: payload.category,
      seat: payload.seat,
      quantity: payload.quantity,
      description: payload.description,
      imageUrl: payload.imageUrl,
    });
  });

  it("omits description and imageUrl from the event when not provided, defaults quantity to 1", async () => {
    const { quantity, description, imageUrl, ...required } =
      validTicketPayload();

    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send(required)
      .expect(201);

    const publisherInstance = (TicketCreatedPublisher as jest.Mock).mock
      .instances[0];
    const publishedData = publisherInstance.publish.mock.calls[0][0];

    expect(publishedData.quantity).toBe(1);
    expect(publishedData.description).toBeUndefined();
    expect(publishedData.imageUrl).toBeUndefined();
  });

  it("does not publish an event when validation fails", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ ...validTicketPayload(), title: "" })
      .expect(400);

    expect(TicketCreatedPublisher).not.toHaveBeenCalled();
  });

  it("does not publish an event when the request is unauthenticated", async () => {
    await request(app)
      .post("/api/tickets")
      .send(validTicketPayload())
      .expect(401);

    expect(TicketCreatedPublisher).not.toHaveBeenCalled();
  });
});

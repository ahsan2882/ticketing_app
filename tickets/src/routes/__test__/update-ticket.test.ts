import { EventType, TicketCategory, TicketStatus } from "@venuepass/common";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { TicketUpdatedPublisher } from "../../events/publishers/ticket-updated-publisher";
import { Ticket } from "../../models/ticket.model";

jest.mock("../../events/publishers/ticket-updated-publisher");

const buildTicket = async (
  overrides: Partial<Parameters<typeof Ticket.build>[0]> = {},
) => {
  const ticket = Ticket.build({
    title: "Original Concert",
    price: 100,
    userId: new mongoose.Types.ObjectId().toHexString(),
    artist: "Original Artist",
    venue: "Original Venue",
    city: "Karachi",
    eventDate: new Date("2030-01-01T20:00:00.000Z"),
    eventType: EventType.Concert,
    category: TicketCategory.STANDARD,
    seat: "A-1",
    quantity: 1,
    description: "Original description",
    imageUrl: "https://example.com/original.jpg",
    ...overrides,
  });

  await ticket.save();
  return ticket;
};

const validUpdatePayload = {
  title: "Updated Concert",
  price: 250,
  artist: "Updated Artist",
  venue: "Updated Venue",
  city: "Lahore",
  eventDate: "2031-05-10T19:30:00.000Z",
  eventType: EventType.Festival,
  category: TicketCategory.VIP,
  seat: "B-20",
  quantity: 5,
  description: "Updated description",
  imageUrl: "https://example.com/updated.jpg",
};

describe("update ticket - authentication", () => {
  it("returns 401 when user is not authenticated", async () => {
    const ticket = await buildTicket();

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .send({ title: "Updated Title" })
      .expect(401);
  });

  it("does not update ticket when user is not authenticated", async () => {
    const ticket = await buildTicket();

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .send({ title: "Updated Title" })
      .expect(401);

    const unchangedTicket = await Ticket.findById(ticket.id);

    expect(unchangedTicket!.title).toEqual("Original Concert");
  });

  it("returns 401 even with valid payload when user is not authenticated", async () => {
    const ticket = await buildTicket();

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .send(validUpdatePayload)
      .expect(401);
  });
});

describe("update ticket - ticket id validation", () => {
  it("returns 404 when id is not a valid ObjectId", async () => {
    await request(app)
      .patch("/api/tickets/not-valid-id")
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(404);
  });

  it("returns 404 when id is too short", async () => {
    await request(app)
      .patch("/api/tickets/123")
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(404);
  });

  it("returns 404 when id has special characters", async () => {
    await request(app)
      .patch("/api/tickets/@@@###")
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(404);
  });

  it("returns 404 when id is valid but ticket does not exist", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .patch(`/api/tickets/${id}`)
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(404);
  });
});

describe("update ticket - authorization", () => {
  it("returns 401 when authenticated user does not own the ticket", async () => {
    const ticket = await buildTicket({
      userId: new mongoose.Types.ObjectId().toHexString(),
    });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(401);
  });

  it("does not update ticket when authenticated user does not own it", async () => {
    const ticket = await buildTicket({
      userId: new mongoose.Types.ObjectId().toHexString(),
    });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(401);

    const unchangedTicket = await Ticket.findById(ticket.id);

    expect(unchangedTicket!.title).toEqual("Original Concert");
  });

  it("allows update when authenticated user owns the ticket", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();

    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "Updated Title" })
      .expect(200);
  });
});

describe("update ticket - successful partial updates", () => {
  it("updates title", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "Updated Title" })
      .expect(200);

    expect(response.body.title).toEqual("Updated Title");
  });

  it("updates price", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ price: 999 })
      .expect(200);

    expect(response.body.price).toEqual(999);
  });

  it("updates artist", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ artist: "New Artist" })
      .expect(200);

    expect(response.body.artist).toEqual("New Artist");
  });

  it("updates venue", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ venue: "New Venue" })
      .expect(200);

    expect(response.body.venue).toEqual("New Venue");
  });

  it("updates city", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ city: "Islamabad" })
      .expect(200);

    expect(response.body.city).toEqual("Islamabad");
  });

  it("updates eventDate", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ eventDate: "2032-10-15T18:00:00.000Z" })
      .expect(200);

    expect(response.body.eventDate).toEqual("2032-10-15T18:00:00.000Z");
  });

  it("updates eventType", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ eventType: EventType.Sports })
      .expect(200);

    expect(response.body.eventType).toEqual(EventType.Sports);
  });

  it("updates category", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ category: TicketCategory.BOX })
      .expect(200);

    expect(response.body.category).toEqual(TicketCategory.BOX);
  });

  it("updates seat", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ seat: "Z-99" })
      .expect(200);

    expect(response.body.seat).toEqual("Z-99");
  });

  it("updates quantity", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ quantity: 10 })
      .expect(200);

    expect(response.body.quantity).toEqual(10);
  });

  it("updates description", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ description: "New description" })
      .expect(200);

    expect(response.body.description).toEqual("New description");
  });

  it("updates imageUrl", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ imageUrl: "https://example.com/new-image.png" })
      .expect(200);

    expect(response.body.imageUrl).toEqual("https://example.com/new-image.png");
  });
});

describe("update ticket - successful full update", () => {
  it("updates all editable fields", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send(validUpdatePayload)
      .expect(200);

    expect(response.body).toMatchObject({
      id: ticket.id,
      title: validUpdatePayload.title,
      price: validUpdatePayload.price,
      artist: validUpdatePayload.artist,
      venue: validUpdatePayload.venue,
      city: validUpdatePayload.city,
      eventDate: validUpdatePayload.eventDate,
      eventType: validUpdatePayload.eventType,
      category: validUpdatePayload.category,
      seat: validUpdatePayload.seat,
      quantity: validUpdatePayload.quantity,
      description: validUpdatePayload.description,
      imageUrl: validUpdatePayload.imageUrl,
      userId,
    });
  });

  it("persists updates to database", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send(validUpdatePayload)
      .expect(200);

    const updatedTicket = await Ticket.findById(ticket.id);

    expect(updatedTicket!.title).toEqual(validUpdatePayload.title);
    expect(updatedTicket!.price).toEqual(validUpdatePayload.price);
    expect(updatedTicket!.artist).toEqual(validUpdatePayload.artist);
    expect(updatedTicket!.venue).toEqual(validUpdatePayload.venue);
    expect(updatedTicket!.city).toEqual(validUpdatePayload.city);
    expect(updatedTicket!.eventType).toEqual(validUpdatePayload.eventType);
    expect(updatedTicket!.category).toEqual(validUpdatePayload.category);
    expect(updatedTicket!.seat).toEqual(validUpdatePayload.seat);
    expect(updatedTicket!.quantity).toEqual(validUpdatePayload.quantity);
    expect(updatedTicket!.description).toEqual(validUpdatePayload.description);
    expect(updatedTicket!.imageUrl).toEqual(validUpdatePayload.imageUrl);
  });
});

describe("update ticket - partial update preservation", () => {
  it("does not change fields that are not provided", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();

    const ticket = await buildTicket({
      userId,
      title: "Original Title",
      price: 150,
      artist: "Original Artist",
      venue: "Original Venue",
      city: "Karachi",
      seat: "A-1",
    });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "Only Title Updated" })
      .expect(200);

    expect(response.body.title).toEqual("Only Title Updated");
    expect(response.body.price).toEqual(150);
    expect(response.body.artist).toEqual("Original Artist");
    expect(response.body.venue).toEqual("Original Venue");
    expect(response.body.city).toEqual("Karachi");
    expect(response.body.seat).toEqual("A-1");
  });

  it("does not change userId even if userId is sent", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const maliciousUserId = new mongoose.Types.ObjectId().toHexString();

    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({
        title: "Updated Title",
        userId: maliciousUserId,
      })
      .expect(200);

    expect(response.body.userId).toEqual(userId);

    const updatedTicket = await Ticket.findById(ticket.id);
    expect(updatedTicket!.userId).toEqual(userId);
  });

  it("does not add unknown fields", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({
        title: "Updated Title",
        adminOnly: true,
      })
      .expect(200);

    expect(response.body.adminOnly).toBeUndefined();

    const updatedTicket = await Ticket.findById(ticket.id);
    expect(updatedTicket!.get("adminOnly")).toBeUndefined();
  });

  it("does not allow empty update body", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();

    const ticket = await buildTicket({
      userId,
      title: "Original Title",
      price: 100,
    });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({})
      .expect(400);
  });
});

describe("update ticket - title validation", () => {
  it("returns 400 when title is empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "" })
      .expect(400);
  });

  it("returns 400 when title is whitespace", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "   " })
      .expect(400);
  });

  it("returns 400 when title is less than 3 characters", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "ab" })
      .expect(400);
  });

  it("trims title before saving", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "   Updated Title   " })
      .expect(200);

    expect(response.body.title).toEqual("Updated Title");
  });
});

describe("update ticket - price validation", () => {
  it("returns 400 when price is 0", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ price: 0 })
      .expect(400);
  });

  it("returns 400 when price is negative", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ price: -10 })
      .expect(400);
  });

  it("returns 400 when price is not numeric", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ price: "abc" })
      .expect(400);
  });

  it("accepts decimal price greater than 0", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ price: 99.99 })
      .expect(200);

    expect(response.body.price).toEqual(99.99);
  });
});

describe("update ticket - string field validation", () => {
  it("returns 400 when artist is empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ artist: "" })
      .expect(400);
  });

  it("returns 400 when venue is empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ venue: "" })
      .expect(400);
  });

  it("returns 400 when city is empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ city: "" })
      .expect(400);
  });

  it("returns 400 when seat is empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ seat: "" })
      .expect(400);
  });

  it("returns 400 when description is empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ description: "" })
      .expect(400);
  });

  it("trims artist, venue, city, seat, and description", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({
        artist: "   Artist   ",
        venue: "   Venue   ",
        city: "   City   ",
        seat: "   Seat-1   ",
        description: "   Description   ",
      })
      .expect(200);

    expect(response.body.artist).toEqual("Artist");
    expect(response.body.venue).toEqual("Venue");
    expect(response.body.city).toEqual("City");
    expect(response.body.seat).toEqual("Seat-1");
    expect(response.body.description).toEqual("Description");
  });
});

describe("update ticket - enum validation", () => {
  it("returns 400 when eventType is invalid", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ eventType: "invalid-event-type" })
      .expect(400);
  });

  it("returns 400 when category is invalid", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ category: "invalid-category" })
      .expect(400);
  });

  it("returns 400 when user tries to update status", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ status: TicketStatus.RESERVED })
      .expect(400);
  });

  it.each(Object.values(EventType))(
    "accepts valid eventType: %s",
    async (eventType) => {
      const userId = new mongoose.Types.ObjectId().toHexString();
      const ticket = await buildTicket({ userId });

      const response = await request(app)
        .patch(`/api/tickets/${ticket.id}`)
        .set("Cookie", await global.signin(userId))
        .send({ eventType })
        .expect(200);

      expect(response.body.eventType).toEqual(eventType);
    },
  );

  it.each(Object.values(TicketCategory))(
    "accepts valid category: %s",
    async (category) => {
      const userId = new mongoose.Types.ObjectId().toHexString();
      const ticket = await buildTicket({ userId });

      const response = await request(app)
        .patch(`/api/tickets/${ticket.id}`)
        .set("Cookie", await global.signin(userId))
        .send({ category })
        .expect(200);

      expect(response.body.category).toEqual(category);
    },
  );
});

describe("update ticket - date, quantity, and URL validation", () => {
  it("returns 400 when eventDate is invalid", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ eventDate: "not-a-date" })
      .expect(400);
  });

  it("returns 200 when quantity is 0", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ quantity: 0 })
      .expect(200);
    expect(response.body.quantity).toEqual(0);
    const updatedTicket = await Ticket.findById(ticket.id);
    expect(updatedTicket!.quantity).toEqual(0);
  });

  it("returns 400 when quantity is negative", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ quantity: -1 })
      .expect(400);
  });

  it("returns 400 when quantity is decimal", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ quantity: 1.5 })
      .expect(400);
  });

  it("returns 400 when imageUrl is invalid", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ imageUrl: "not-a-url" })
      .expect(400);
  });

  it("accepts a valid imageUrl", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ imageUrl: "https://example.com/ticket.png" })
      .expect(200);

    expect(response.body.imageUrl).toEqual("https://example.com/ticket.png");
  });
});

describe("update ticket - event publishing", () => {
  beforeEach(() => {
    (TicketUpdatedPublisher as jest.Mock).mockClear();
  });

  it("publishes a TicketUpdated event after a successful update", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send(validUpdatePayload)
      .expect(200);

    const updatedTicket = await Ticket.findById(ticket.id);

    expect(TicketUpdatedPublisher).toHaveBeenCalledTimes(1);

    const publisherInstance = (TicketUpdatedPublisher as jest.Mock).mock
      .instances[0];
    expect(publisherInstance.publish).toHaveBeenCalledTimes(1);

    const publishedData = publisherInstance.publish.mock.calls[0][0];
    expect(publishedData).toMatchObject({
      id: ticket.id,
      userId,
      title: validUpdatePayload.title,
      price: validUpdatePayload.price,
      version: updatedTicket?.version,
    });
  });

  it("includes all the publishable fields even though some were actually updated", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId, title: "Original Title" });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "Only Title Updated" })
      .expect(200);

    const updatedTicket = await Ticket.findById(ticket.id);

    const publisherInstance = (TicketUpdatedPublisher as jest.Mock).mock
      .instances[0];
    const publishedData = publisherInstance.publish.mock.calls[0][0];

    expect(publishedData).toEqual({
      id: ticket.id,
      userId,
      title: "Only Title Updated",
      price: 100,
      status: TicketStatus.AVAILABLE,
      version: updatedTicket?.version,
    });
  });

  it("does not publish when body was empty", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({})
      .expect(400);

    expect(TicketUpdatedPublisher).toHaveBeenCalledTimes(0);
  });

  it("does not publish an event when validation fails", async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const ticket = await buildTicket({ userId });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin(userId))
      .send({ title: "" })
      .expect(400);

    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
  });

  it("does not publish an event when the ticket is not found", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();

    await request(app)
      .patch(`/api/tickets/${id}`)
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(404);

    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
  });

  it("does not publish an event when the user does not own the ticket", async () => {
    const ticket = await buildTicket({
      userId: new mongoose.Types.ObjectId().toHexString(),
    });

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set("Cookie", await global.signin())
      .send({ title: "Updated Title" })
      .expect(401);

    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
  });

  it("does not publish an event when the request is unauthenticated", async () => {
    const ticket = await buildTicket();

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .send({ title: "Updated Title" })
      .expect(401);

    expect(TicketUpdatedPublisher).not.toHaveBeenCalled();
  });
});

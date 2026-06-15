import request from "supertest";
import { app } from "../../app";
import { Ticket } from "../../models/ticket.model";

describe("tickets service - create", () => {
  it("has a route handler listening to /api/tickets for post requests", async () => {
    const response = await request(app).post("/api/tickets").send({});
    expect(response.status).not.toEqual(404);
  });

  it("can only be accessed if the user is signed in", async () => {
    await request(app).post("/api/tickets").send({}).expect(401);
  });

  it("returns a status other than 401 if the user is signed in", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin())
      .send({});
    expect(response.status).not.toEqual(401);
  });

  it("creates a ticket with valid inputs", async () => {
    let tickets = await Ticket.find({});
    expect(tickets.length).toEqual(0);
    await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin())
      .send({ title: "Sample", price: 10 })
      .expect(201);

    tickets = await Ticket.find({});
    expect(tickets.length).toEqual(1);
  });

  describe("title validation", () => {
    it("returns 400 when title is only whitespace", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "   ", price: 10 })
        .expect(400);
    });

    it("returns 400 when title is shorter than 3 characters", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "ab", price: 10 })
        .expect(400);
    });

    it("returns 201 when title is exactly 3 characters", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "abc", price: 10 })
        .expect(201);
    });

    it("returns 400 when title is null", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: null, price: 10 })
        .expect(400);
    });

    it("returns 400 when title is a number (wrong type)", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: 12345, price: 10 })
        .expect(400);
    });

    it("accepts a very long title", async () => {
      const longTitle = "a".repeat(500);
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: longTitle, price: 10 })
        .expect(201);
    });

    it("accepts a title with special characters", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Concert @ Venue! 🎵", price: 10 })
        .expect(201);
    });

    it("returns an error if an invalid title is provided", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "", price: 10 })
        .expect(400);
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ price: 10 })
        .expect(400);
    });
  });

  describe("price validation", () => {
    it("returns 400 when price is zero", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: 0 })
        .expect(400);
    });

    it("returns 400 when price is a negative float", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: -0.01 })
        .expect(400);
    });

    it("returns 201 for price with two decimal places", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: 9.99 })
        .expect(201);
    });

    it("returns 201 for a very large price", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: 999999.99 })
        .expect(201);
    });

    it("returns 400 when price is a string", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: "expensive" })
        .expect(400);
    });

    it("returns 400 when price is null", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: null })
        .expect(400);
    });

    it("returns an error if an invalid price is provided", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: -10 })
        .expect(400);
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample" })
        .expect(400);
    });
  });

  describe("request body edge cases", () => {
    it("returns 400 when body is completely empty", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({})
        .expect(400);
    });

    it("ignores unknown extra fields in the body", async () => {
      const response = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: 10, unknownField: "hacked" })
        .expect(201);

      expect(response.body).not.toHaveProperty("unknownField");
    });

    it("returns 400 for both missing title and price at once", async () => {
      const response = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({})
        .expect(400);

      // Should surface errors for both fields
      expect(response.body.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("persistence and response shape", () => {
    it("persists the correct title and price to the database", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Rock Concert", price: 49.99 })
        .expect(201);

      const ticket = await Ticket.findOne({ title: "Rock Concert" });
      expect(ticket).toBeDefined();
      expect(ticket!.price).toEqual(49.99);
    });

    it("associates the ticket with the authenticated user", async () => {
      const cookie = await global.signin();
      await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Sample", price: 10 })
        .expect(201);

      const ticket = await Ticket.findOne({ title: "Sample" });
      expect(ticket!.userId).toBeDefined();
      expect(typeof ticket!.userId).toBe("string");
    });

    it("response body contains id, title, and price", async () => {
      const response = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: 10 })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toEqual("Sample");
      expect(response.body.price).toEqual(10);
    });

    it("two separate users can each create a ticket", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Ticket A", price: 10 })
        .expect(201);

      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Ticket B", price: 20 })
        .expect(201);

      const tickets = await Ticket.find({});
      expect(tickets.length).toEqual(2);
    });

    it("the same user can create multiple tickets", async () => {
      const cookie = await global.signin();

      await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "First", price: 5 })
        .expect(201);

      await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Second", price: 15 })
        .expect(201);

      const tickets = await Ticket.find({});
      expect(tickets.length).toEqual(2);
    });

    it("each created ticket gets a unique id", async () => {
      const res1 = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "First", price: 5 })
        .expect(201);

      const res2 = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Second", price: 15 })
        .expect(201);

      expect(res1.body.id).not.toEqual(res2.body.id);
    });
  });

  describe("authentication edge cases", () => {
    it("returns 401 when cookie is malformed", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", "session=invalidgarbage")
        .send({ title: "Sample", price: 10 })
        .expect(401);
    });

    it("returns 401 when no cookie header is set at all", async () => {
      await request(app)
        .post("/api/tickets")
        .send({ title: "Sample", price: 10 })
        .expect(401);
    });
  });
});

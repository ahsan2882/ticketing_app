import request from "supertest";
import { app } from "../../app";

describe("Tickets service - find all", () => {
  it("fetches all tickets", async () => {
    await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin())
      .send({ title: "Sample1", price: 10 })
      .expect(201);
    await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin())
      .send({ title: "Sample2", price: 20 })
      .expect(201);
    const ticketResponse = await request(app)
      .get("/api/tickets")
      .send()
      .expect(200);
    expect(ticketResponse.body.length).toEqual(2);
  });

  describe("empty state", () => {
    it("returns 200 with an empty array when no tickets exist", async () => {
      const response = await request(app)
        .get("/api/tickets")
        .send()
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toEqual(0);
    });
  });

  describe("response shape", () => {
    it("each ticket contains id, title, and price", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: 15 })
        .expect(201);

      const response = await request(app)
        .get("/api/tickets")
        .send()
        .expect(200);

      const ticket = response.body[0];
      expect(ticket).toHaveProperty("id");
      expect(ticket).toHaveProperty("title");
      expect(ticket).toHaveProperty("price");
    });

    it("returns tickets with correct values", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Concert", price: 49.99 })
        .expect(201);

      const response = await request(app)
        .get("/api/tickets")
        .send()
        .expect(200);

      expect(response.body[0].title).toEqual("Concert");
      expect(response.body[0].price).toEqual(49.99);
    });

    it("returns tickets as an array even when only one ticket exists", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Solo", price: 5 })
        .expect(201);

      const response = await request(app)
        .get("/api/tickets")
        .send()
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toEqual(1);
    });
  });

  describe("accessibility", () => {
    it("is publicly accessible without authentication", async () => {
      await request(app).get("/api/tickets").send().expect(200);
    });

    it("returns the same tickets regardless of whether the requester is signed in", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Sample", price: 10 })
        .expect(201);

      const unauthResponse = await request(app)
        .get("/api/tickets")
        .send()
        .expect(200);

      const authResponse = await request(app)
        .get("/api/tickets")
        .set("Cookie", await global.signin())
        .send()
        .expect(200);

      expect(unauthResponse.body.length).toEqual(authResponse.body.length);
      expect(unauthResponse.body[0].id).toEqual(authResponse.body[0].id);
    });
  });

  describe("multi-user scenarios", () => {
    it("returns tickets created by different users", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "User1 Ticket", price: 10 })
        .expect(201);

      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "User2 Ticket", price: 20 })
        .expect(201);

      const response = await request(app)
        .get("/api/tickets")
        .send()
        .expect(200);

      expect(response.body.length).toEqual(2);
      const titles = response.body.map((t: { title: string }) => t.title);
      expect(titles).toContain("User1 Ticket");
      expect(titles).toContain("User2 Ticket");
    });

    it("returns all tickets from a single user who created many", async () => {
      const cookie = await global.signin();

      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          request(app)
            .post("/api/tickets")
            .set("Cookie", cookie)
            .send({ title: `Ticket ${i + 1}`, price: i + 1 })
            .expect(201),
        ),
      );

      const response = await request(app)
        .get("/api/tickets")
        .send()
        .expect(200);

      expect(response.body.length).toEqual(5);
    });
  });

  describe("route correctness", () => {
    it("responds with 200 and not 404 on GET /api/tickets", async () => {
      const response = await request(app).get("/api/tickets").send();

      expect(response.status).not.toEqual(404);
      expect(response.status).toEqual(200);
    });
  });
});

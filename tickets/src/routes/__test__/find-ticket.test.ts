import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";

describe("Tickets service - find", () => {
  it("returns a 404 if the ticket is not found", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    await request(app).get(`/api/tickets/${id}`).send().expect(404);
  });

  it("returns the ticket if the ticket is found", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin())
      .send({ title: "Sample", price: 10 });
    expect(response.status).toEqual(201);
    const ticketResponse = await request(app)
      .get(`/api/tickets/${response.body.id}`)
      .send();
    expect(ticketResponse.status).toEqual(200);
    expect(ticketResponse.body.title).toBe("Sample");
    expect(ticketResponse.body.price).toBe(10);
  });

  describe("invalid id formats", () => {
    it("returns 404 for a malformed (non-ObjectId) id", async () => {
      await request(app).get("/api/tickets/not-a-valid-id").send().expect(404);
    });

    it("returns 404 for a valid ObjectId that does not exist in the DB", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      await request(app)
        .get(`/api/tickets/${nonExistentId}`)
        .send()
        .expect(404);
    });

    it("returns 404 for a numeric string id", async () => {
      await request(app).get("/api/tickets/12345678").send().expect(404);
    });

    it("returns 404 for a SQL-injection-style id", async () => {
      await request(app).get("/api/tickets/1' OR '1'='1").send().expect(404);
    });
  });

  describe("response shape", () => {
    it("response contains id, title, and price fields", async () => {
      const created = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Shape Test", price: 25 })
        .expect(201);

      const response = await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .send()
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("price");
    });

    it("returns exact title and price values that were saved", async () => {
      const created = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Exact Match", price: 99.99 })
        .expect(201);

      const response = await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .send()
        .expect(200);

      expect(response.body.title).toEqual("Exact Match");
      expect(response.body.price).toEqual(99.99);
    });

    it("returned id matches the requested id", async () => {
      const created = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "ID Check", price: 10 })
        .expect(201);

      const response = await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .send()
        .expect(200);

      expect(response.body.id).toEqual(created.body.id);
    });
  });

  describe("accessibility", () => {
    it("is publicly accessible without authentication", async () => {
      const created = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Public Ticket", price: 10 })
        .expect(201);

      await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .send()
        .expect(200);
    });

    it("returns the same ticket for an authenticated and unauthenticated request", async () => {
      const created = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Auth Parity", price: 10 })
        .expect(201);

      const unauthRes = await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .send()
        .expect(200);

      const authRes = await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .set("Cookie", await global.signin())
        .send()
        .expect(200);

      expect(unauthRes.body.id).toEqual(authRes.body.id);
      expect(unauthRes.body.title).toEqual(authRes.body.title);
    });
  });

  describe("ticket isolation", () => {
    it("fetching one ticket does not return another ticket's data", async () => {
      const first = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "First", price: 10 })
        .expect(201);

      const second = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Second", price: 20 })
        .expect(201);

      const response = await request(app)
        .get(`/api/tickets/${first.body.id}`)
        .send()
        .expect(200);

      expect(response.body.id).toEqual(first.body.id);
      expect(response.body.title).toEqual("First");
      expect(response.body.id).not.toEqual(second.body.id);
    });

    it("deleted (non-existent) id returns 404 even if other tickets exist", async () => {
      await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Existing", price: 10 })
        .expect(201);

      const ghostId = new mongoose.Types.ObjectId().toHexString();
      await request(app).get(`/api/tickets/${ghostId}`).send().expect(404);
    });
  });

  describe("repeated access", () => {
    it("fetching the same ticket twice returns consistent data", async () => {
      const created = await request(app)
        .post("/api/tickets")
        .set("Cookie", await global.signin())
        .send({ title: "Consistent", price: 30 })
        .expect(201);

      const first = await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .send()
        .expect(200);

      const second = await request(app)
        .get(`/api/tickets/${created.body.id}`)
        .send()
        .expect(200);

      expect(first.body).toEqual(second.body);
    });
  });
});

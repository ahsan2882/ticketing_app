import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";

describe("tickets service - update ticket", () => {
  it("returns a 404 when update request has an id referencing a ticket that doesn't exist", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    await request(app)
      .patch(`/api/tickets/${id}`)
      .set("Cookie", await global.signin())
      .send({ title: "new title", price: 30 })
      .expect(404);
  });

  it("returns a 401 when user is not authenticated when updating a ticket", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    await request(app)
      .patch(`/api/tickets/${id}`)
      .send({ title: "new title", price: 30 })
      .expect(401);
  });

  it("returns a 401 if the user tries to update a ticket user does not own", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", await global.signin())
      .send({ title: "Sample", price: 10 });
    const updatedTicketResponse = await request(app)
      .patch(`/api/tickets/${response.body.id}`)
      .set("Cookie", await global.signin())
      .send({ title: "Update sample", price: 111 });
    expect(updatedTicketResponse.status).toEqual(401);
    const fetchedTicket = await request(app)
      .get(`/api/tickets/${response.body.id}`)
      .send();
    expect(fetchedTicket.body.title).toEqual("Sample");
    expect(fetchedTicket.body.price).toEqual(10);
  });

  it("returns a 400 if the user provides an invalid title or price", async () => {
    const userCookie = await global.signin();
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", userCookie)
      .send({ title: "Sample", price: 10 });
    const updatedTicketResponse = await request(app)
      .patch(`/api/tickets/${response.body.id}`)
      .set("Cookie", userCookie)
      .send({ title: "U", price: -11 });
    expect(updatedTicketResponse.status).toEqual(400);
  });

  it("updates the ticket if user is authenticated and valid inputs are provided", async () => {
    const userCookie = await global.signin();
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", userCookie)
      .send({ title: "Sample", price: 10 });

    const r = await request(app)
      .patch(`/api/tickets/${response.body.id}`)
      .set("Cookie", userCookie)
      .send({ title: "Updated sample", price: 101 })
      .expect(200);
    const updatedTicketResponse = await request(app)
      .get(`/api/tickets/${response.body.id}`)
      .send();
    expect(updatedTicketResponse.body.title).toEqual("Updated sample");
    expect(updatedTicketResponse.body.price).toEqual(101);
  });

  describe("id validation", () => {
    it("returns 404 for a malformed (non-ObjectId) id", async () => {
      await request(app)
        .patch("/api/tickets/not-a-valid-id")
        .set("Cookie", await global.signin())
        .send({ title: "Updated", price: 10 })
        .expect(404);
    });

    it("returns 404 for a numeric string id", async () => {
      await request(app)
        .patch("/api/tickets/12345678")
        .set("Cookie", await global.signin())
        .send({ title: "Updated", price: 10 })
        .expect(404);
    });
  });

  describe("title validation", () => {
    it("returns 400 when title is less than 3 characters", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Sample", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "ab" })
        .expect(400);
    });

    it("returns 400 when title is an empty string", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Sample", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "" })
        .expect(400);
    });

    it("accepts a title update with exactly 3 characters", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Sample", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "abc" })
        .expect(200);
    });
  });

  describe("price validation", () => {
    it("returns 400 when price is zero", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Sample", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ price: 0 })
        .expect(400);
    });

    it("returns 400 when price is a string", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Sample", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ price: "expensive" })
        .expect(400);
    });

    it("accepts a price update with two decimal places", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Sample", price: 10 })
        .expect(201);

      const response = await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ price: 49.99 })
        .expect(200);

      expect(response.body.price).toEqual(49.99);
    });
  });

  describe("partial updates", () => {
    it("updates only the title when price is omitted", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Original", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "Updated Title" })
        .expect(200);

      const fetched = await request(app).get(`/api/tickets/${body.id}`).send();
      expect(fetched.body.title).toEqual("Updated Title");
      expect(fetched.body.price).toEqual(10);
    });

    it("updates only the price when title is omitted", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Original", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ price: 99 })
        .expect(200);

      const fetched = await request(app).get(`/api/tickets/${body.id}`).send();
      expect(fetched.body.title).toEqual("Original");
      expect(fetched.body.price).toEqual(99);
    });

    it("returns 200 with no change when body is empty (no fields to update)", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Original", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({})
        .expect(200);

      const fetched = await request(app).get(`/api/tickets/${body.id}`).send();
      expect(fetched.body.title).toEqual("Original");
      expect(fetched.body.price).toEqual(10);
    });

    it("ignores unknown fields in the update body", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Original", price: 10 })
        .expect(201);

      const response = await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "Updated", unknownField: "injected" })
        .expect(200);

      expect(response.body).not.toHaveProperty("unknownField");
    });
  });

  describe("ownership", () => {
    it("does not modify the ticket when an unauthorized user attempts an update", async () => {
      const ownerCookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", ownerCookie)
        .send({ title: "Original", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", await global.signin())
        .send({ title: "Hijacked", price: 999 })
        .expect(401);

      const fetched = await request(app).get(`/api/tickets/${body.id}`).send();
      expect(fetched.body.title).toEqual("Original");
      expect(fetched.body.price).toEqual(10);
    });

    it("owner can update their ticket multiple times", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Version 1", price: 10 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "Version 2", price: 20 })
        .expect(200);

      await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "Version 3", price: 30 })
        .expect(200);

      const fetched = await request(app).get(`/api/tickets/${body.id}`).send();
      expect(fetched.body.title).toEqual("Version 3");
      expect(fetched.body.price).toEqual(30);
    });
  });

  describe("response shape", () => {
    it("response contains the updated title and price", async () => {
      const cookie = await global.signin();
      const { body } = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Original", price: 10 })
        .expect(201);

      const response = await request(app)
        .patch(`/api/tickets/${body.id}`)
        .set("Cookie", cookie)
        .send({ title: "Updated", price: 50 })
        .expect(200);

      expect(response.body.title).toEqual("Updated");
      expect(response.body.price).toEqual(50);
      expect(response.body.id).toEqual(body.id);
    });

    it("updating one ticket does not affect another ticket", async () => {
      const cookie = await global.signin();

      const first = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "First", price: 10 })
        .expect(201);

      const second = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .send({ title: "Second", price: 20 })
        .expect(201);

      await request(app)
        .patch(`/api/tickets/${first.body.id}`)
        .set("Cookie", cookie)
        .send({ title: "First Updated", price: 99 })
        .expect(200);

      const fetchedSecond = await request(app)
        .get(`/api/tickets/${second.body.id}`)
        .send();

      expect(fetchedSecond.body.title).toEqual("Second");
      expect(fetchedSecond.body.price).toEqual(20);
    });
  });
});

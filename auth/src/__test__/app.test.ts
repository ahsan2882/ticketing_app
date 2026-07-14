import request from "supertest";
import { app } from "../app";
import { healthState } from "../health";

describe("application routes", () => {
  afterEach(() => {
    healthState.setNotReady("mongo");
  });

  it("returns a healthy response from GET /healthz", async () => {
    const response = await request(app).get("/healthz").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });

  it("reports not ready while MongoDB is unavailable", async () => {
    healthState.setNotReady("mongo");

    const response = await request(app).get("/readyz").expect(503);

    expect(response.body).toEqual({
      status: "not_ready",
      mongo: false,
    });
  });

  it("reports ready while MongoDB is available", async () => {
    healthState.setReady("mongo");

    const response = await request(app).get("/readyz").expect(200);

    expect(response.body).toEqual({
      status: "ready",
      mongo: true,
    });
  });

  it("returns a structured 404 for an unknown route", async () => {
    const response = await request(app).get("/does-not-exist").expect(404);

    expect(response.body).toEqual({
      errors: [{ message: "Route not found in auth service" }],
    });
  });

  it("returns JSON for unknown routes", async () => {
    const response = await request(app).delete("/does-not-exist").expect(404);

    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("rejects malformed JSON request bodies", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .set("Content-Type", "application/json")
      .send('{"email":')
      .expect(500);

    expect(response.body).toHaveProperty("errors");
  });
});

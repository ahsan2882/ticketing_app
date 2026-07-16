import request from "supertest";
import { app } from "../../app";
import { healthState } from "../../health";

describe("payments service health and fallback routes", () => {
  beforeEach(() => {
    healthState.setNotReady("mongo");
    healthState.setNotReady("nats");
  });

  afterEach(() => {
    healthState.setNotReady("mongo");
    healthState.setNotReady("nats");
  });

  it("returns a successful liveness response regardless of dependency readiness", async () => {
    const { body } = await request(app).get("/healthz").expect(200);

    expect(body).toEqual({ status: "ok" });
  });

  it("returns 503 with individual dependency states while not ready", async () => {
    healthState.setReady("mongo");

    const { body } = await request(app).get("/readyz").expect(503);

    expect(body).toEqual({
      status: "not_ready",
      mongo: true,
      nats: false,
    });
  });

  it("returns 200 only after both MongoDB and NATS are ready", async () => {
    healthState.setReady("mongo");
    healthState.setReady("nats");

    const { body } = await request(app).get("/readyz").expect(200);

    expect(body).toEqual({
      status: "ready",
      mongo: true,
      nats: true,
    });
  });

  it("returns 404 for an unknown route", async () => {
    await request(app).get("/api/payments-does-not-exist").expect(404);
  });
});

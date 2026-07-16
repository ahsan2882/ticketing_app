import request from "supertest";
import { app } from "../../app";
import { healthState } from "../../health";

describe("orders service status routes", () => {
  beforeEach(() => {
    healthState.setNotReady("mongo");
    healthState.setNotReady("nats");
  });

  it("returns a successful liveness response", async () => {
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

  it("returns 200 only after every dependency is ready", async () => {
    healthState.setReady("mongo");
    healthState.setReady("nats");

    const { body } = await request(app).get("/readyz").expect(200);

    expect(body).toEqual({
      status: "ready",
      mongo: true,
      nats: true,
    });
  });

  it("returns the service-specific 404 error for an unknown route", async () => {
    const { body } = await request(app)
      .get("/api/orders/route/that/does/not/exist")
      .expect(404);

    expect(body).toEqual({
      errors: [{ message: "Route not found in orders service" }],
    });
  });
});

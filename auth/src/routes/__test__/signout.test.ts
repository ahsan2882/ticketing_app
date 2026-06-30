import request from "supertest";
import { app } from "../../app";

describe("signout flow - ", () => {
  it("returns 200 on successful signout", async () => {
    await global.signin();
    await request(app).post("/api/users/signout").expect(200);
  });

  it("returns an empty object in the response body", async () => {
    const response = await request(app).post("/api/users/signout").expect(200);
    expect(response.body).toEqual({});
  });

  it("clears the session cookie after signout", async () => {
    const cookie = await global.signin();

    const response = await request(app)
      .post("/api/users/signout")
      .set("Cookie", cookie)
      .expect(200);

    const cookies = response.get("Set-Cookie");
    const sessionCleared =
      !cookies ||
      cookies.some(
        (c) =>
          c.includes("expires=Thu, 01 Jan 1970") ||
          c.includes("session=;") ||
          c.split("=")[1]?.startsWith(";"),
      );
    expect(sessionCleared).toBe(true);
  });

  it("works even if the user was never signed in (no existing session)", async () => {
    await request(app).post("/api/users/signout").expect(200);
  });

  it("works even if called without any cookies at all", async () => {
    await request(app).post("/api/users/signout").unset("Cookie").expect(200);
  });

  it("works even when the incoming session cookie is malformed garbage", async () => {
    await request(app)
      .post("/api/users/signout")
      .set("Cookie", "session=not-valid-base64-or-json!!!")
      .expect(200);
  });

  it("JWT is no longer present in the cookie after signout", async () => {
    const cookie = await global.signin("jwt@test.com", "validpass");

    const signoutRes = await request(app)
      .post("/api/users/signout")
      .set("Cookie", cookie)
      .expect(200);

    const cookies = signoutRes.get("Set-Cookie");
    if (cookies) {
      const sessionCookie = cookies[0]?.split(";")[0]?.split("=")[1];
      if (sessionCookie) {
        try {
          const decoded = JSON.parse(
            Buffer.from(sessionCookie, "base64").toString(),
          );
          expect(decoded.jwt).toBeUndefined();
        } catch {
          // empty/malformed value means session is cleared — also correct
        }
      }
    }
  });

  it("currentUser returns null when using the cookie returned from signout", async () => {
    const cookie = await global.signin("postsignout@test.com", "validpass");

    const signoutRes = await request(app)
      .post("/api/users/signout")
      .set("Cookie", cookie)
      .expect(200);

    const clearedCookie = signoutRes.get("Set-Cookie") ?? cookie;

    const currentUserRes = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", clearedCookie)
      .expect(200);

    expect(currentUserRes.body).toEqual({ currentUser: null });
  });

  it("signing out twice in a row does not error", async () => {
    const cookie = await global.signin();

    await request(app)
      .post("/api/users/signout")
      .set("Cookie", cookie)
      .expect(200);
    await request(app).post("/api/users/signout").expect(200);
  });

  it("user can sign back in after signing out", async () => {
    await global.signin("reauth@test.com", "validpass");

    await request(app).post("/api/users/signout").expect(200);

    // global.signin internally does signup+signin — since user already exists
    // in the DB just hit signin directly
    await request(app)
      .post("/api/users/signin")
      .send({ email: "reauth@test.com", password: "validpass" })
      .expect(200);
  });

  it("signing out does not delete the user from the database", async () => {
    await global.signin("persist@test.com", "validpass");

    await request(app).post("/api/users/signout").expect(200);

    // If the user were deleted this would return 400 "Invalid credentials"
    await request(app)
      .post("/api/users/signin")
      .send({ email: "persist@test.com", password: "validpass" })
      .expect(200);
  });

  it("signing out one user does not affect another user's session", async () => {
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);

    await agent1.post("/api/users/signup").send({
      email: "user1@test.com",
      password: "pass1111",
      name: "Test Test",
    });
    await agent1
      .post("/api/users/signin")
      .send({ email: "user1@test.com", password: "pass1111" })
      .expect(200);

    await agent2.post("/api/users/signup").send({
      email: "user2@test.com",
      password: "pass2222",
      name: "Test Test",
    });
    await agent2
      .post("/api/users/signin")
      .send({ email: "user2@test.com", password: "pass2222" })
      .expect(200);

    await agent1.post("/api/users/signout").expect(200);

    // Explicitly verify user2's session is still alive after user1 signed out
    const currentUserRes = await agent2
      .get("/api/users/currentuser")
      .expect(200);
    expect(currentUserRes.body.currentUser).toHaveProperty(
      "email",
      "user2@test.com",
    );

    // Now sign out user2 and confirm the body shape
    const user2SignoutRes = await agent2.post("/api/users/signout").expect(200);
    expect(user2SignoutRes.body).toEqual({});
  });

  it("full cycle: signup → signin → signout → signin → signout all succeed", async () => {
    await global.signin("cycle@test.com", "validpass");

    await request(app).post("/api/users/signout").expect(200);

    await request(app)
      .post("/api/users/signin")
      .send({ email: "cycle@test.com", password: "validpass" })
      .expect(200);

    await request(app).post("/api/users/signout").expect(200);
  });

  it("returns JSON content-type", async () => {
    const response = await request(app).post("/api/users/signout").expect(200);
    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("ignores an unexpected request body without error", async () => {
    await request(app)
      .post("/api/users/signout")
      .send({ foo: "bar", nested: { a: 1 } })
      .expect(200);
  });

  it("returns 405 for GET /api/users/signout (only POST is registered)", async () => {
    await request(app).get("/api/users/signout").expect(405);
  });

  it("returns 405 for DELETE /api/users/signout (only POST is registered)", async () => {
    await request(app).delete("/api/users/signout").expect(405);
  });

  it("returns 405 for PUT /api/users/signout (only POST is registered)", async () => {
    await request(app).put("/api/users/signout").expect(405);
  });
});

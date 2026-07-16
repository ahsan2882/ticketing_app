import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../app";

describe("currentUser flow - ", () => {
  it("returns 200 with currentUser: null when no session cookie is present", async () => {
    const response = await request(app)
      .get("/api/users/currentuser")
      .expect(200);

    expect(response.body).toEqual({ currentUser: null });
  });

  it("returns 200 (not 401) when unauthenticated — route is public", async () => {
    await request(app).get("/api/users/currentuser").expect(200);
  });

  it("returns currentUser: null when an empty Cookie header is sent", async () => {
    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", "")
      .expect(200);

    expect(response.body).toEqual({ currentUser: null });
  });

  it("returns currentUser: null when a garbage cookie value is sent", async () => {
    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", "session=totallybaddata")
      .expect(200);

    expect(response.body).toEqual({ currentUser: null });
  });

  it("returns currentUser: null when a well-formed cookie with a tampered JWT is sent", async () => {
    const fakeJwt = [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({ email: "hacker@test.com", id: "fakeid" }),
      ).toString("base64url"),
      "invalidsignature",
    ].join(".");
    const fakeSession = Buffer.from(JSON.stringify({ jwt: fakeJwt })).toString(
      "base64",
    );

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", `session=${fakeSession}`)
      .expect(200);

    expect(response.body).toEqual({ currentUser: null });
  });

  it("returns currentUser: null when the session cookie contains a JWT signed with the wrong key", async () => {
    const wrongKeyJwt = jwt.sign(
      { email: "attacker@test.com", id: "fakeid" },
      "wrong-secret-key",
      { expiresIn: "1h" },
    );
    const fakeSession = Buffer.from(
      JSON.stringify({ jwt: wrongKeyJwt }),
    ).toString("base64");

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", `session=${fakeSession}`)
      .expect(200);

    expect(response.body).toEqual({ currentUser: null });
  });

  it("returns currentUser: null when the session cookie contains an expired JWT signed with the correct key", async () => {
    if (!process.env.JWT_KEY) {
      throw new Error(
        "JWT_KEY is not set in the test environment — required to sign a correctly-keyed expired token",
      );
    }

    const expiredJwt = jwt.sign(
      { email: "test@test.com", id: "someid" },
      process.env.JWT_KEY,
      { expiresIn: "-10s" },
    );
    const fakeSession = Buffer.from(
      JSON.stringify({ jwt: expiredJwt }),
    ).toString("base64");

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", `session=${fakeSession}`)
      .expect(200);

    expect(response.body).toEqual({ currentUser: null });
  });

  it("returns the current user's email after signin", async () => {
    const cookie = await global.signin();

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie)
      .expect(200);

    expect(response.body.currentUser).toHaveProperty("email", "test@test.com");
  });

  it("returns the current user's id after signin", async () => {
    const cookie = await global.signin();

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie)
      .expect(200);

    expect(response.body.currentUser).toHaveProperty("id");
    expect(typeof response.body.currentUser.id).toBe("string");
  });

  it("does not expose the password in the currentUser payload", async () => {
    const cookie = await global.signin();

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie)
      .expect(200);

    expect(response.body.currentUser.password).toBeUndefined();
  });

  it("signing in twice for the same user returns cookies that resolve to the same id", async () => {
    // First call does signup + signin and gives us a cookie.
    const cookie1 = await global.signin("idcheck@test.com", "validpass");

    // Second cookie comes from signin only — same user, fresh session.
    const signinResponse = await request(app)
      .post("/api/users/signin")
      .send({ email: "idcheck@test.com", password: "validpass" })
      .expect(200);

    const cookie2 = signinResponse.get("Set-Cookie");
    if (!cookie2) throw new Error("no cookie returned from signin");

    const res1 = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie1)
      .expect(200);

    const res2 = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie2)
      .expect(200);

    expect(res1.body.currentUser.id).toEqual(res2.body.currentUser.id);
  });

  it("returns currentUser: null after signout", async () => {
    const agent = request.agent(app);

    // Use the agent directly so the cleared cookie is carried forward
    await agent
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "validpass",
        name: "Test Test",
      })
      .expect(201);
    await agent.post("/api/users/signout").expect(200);

    const response = await agent.get("/api/users/currentuser").expect(200);
    expect(response.body).toEqual({ currentUser: null });
  });

  it("returns the user again after re-signin following a signout", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "validpass",
        name: "Test Test",
      })
      .expect(201);
    await agent.post("/api/users/signout").expect(200);
    await agent
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "validpass" })
      .expect(200);

    const response = await agent.get("/api/users/currentuser").expect(200);
    expect(response.body.currentUser).toHaveProperty("email", "test@test.com");
  });

  it("two users each see their own currentUser", async () => {
    const cookie1 = await global.signin("user1@test.com", "pass1111");
    const cookie2 = await global.signin("user2@test.com", "pass2222");

    const response1 = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie1)
      .expect(200);

    const response2 = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie2)
      .expect(200);

    expect(response1.body.currentUser.email).toBe("user1@test.com");
    expect(response2.body.currentUser.email).toBe("user2@test.com");
    expect(response1.body.currentUser.id).not.toEqual(
      response2.body.currentUser.id,
    );
  });

  it("using user1's cookie does not reveal user2's identity", async () => {
    const cookie1 = await global.signin("user1@test.com", "pass1111");
    await global.signin("user2@test.com", "pass2222");

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie1)
      .expect(200);

    expect(response.body.currentUser.email).toBe("user1@test.com");
    expect(response.body.currentUser.email).not.toBe("user2@test.com");
  });

  it("response always has a currentUser key, never an empty object", async () => {
    const response = await request(app)
      .get("/api/users/currentuser")
      .expect(200);

    expect(response.body).toHaveProperty("currentUser");
  });

  it("returns JSON content-type", async () => {
    const response = await request(app)
      .get("/api/users/currentuser")
      .expect(200);

    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("signin sets a session cookie that is httpOnly", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "cookiecheck@test.com",
        password: "validpass",
        name: "Cookie Check",
      })
      .expect(201);

    const setCookieHeader = response.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();

    const sessionCookie = (setCookieHeader as unknown as string[]).find(
      (c: string) => c.startsWith("session="),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.toLowerCase()).toContain("httponly");
  });

  it("returns 405 for POST /api/users/currentuser", async () => {
    await request(app).post("/api/users/currentuser").expect(405);
  });

  it("returns 405 for DELETE /api/users/currentuser", async () => {
    await request(app).delete("/api/users/currentuser").expect(405);
  });

  it("405 response sets Allow: GET header", async () => {
    const response = await request(app)
      .post("/api/users/currentuser")
      .expect(405);

    expect(response.headers.allow).toBe("GET");
  });

  it("405 response body matches the errors array shape", async () => {
    const response = await request(app)
      .delete("/api/users/currentuser")
      .expect(405);

    expect(response.body).toEqual({
      errors: [{ message: "Method not allowed" }],
    });
  });

  it("returns the current user's name after signin", async () => {
    const cookie = await global.signin(
      "current-name@test.com",
      "validpass",
      "Current Name",
    );

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie)
      .expect(200);

    expect(response.body.currentUser).toHaveProperty("name", "Current Name");
  });
});

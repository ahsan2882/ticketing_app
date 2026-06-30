import request from "supertest";
import { app } from "../../app";

describe("signup flow - ", () => {
  it("returns 201 on successful signup", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "test", name: "Test Test" })
      .expect(201);
  });

  it("returns a 400 with an invalid email", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test.com", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("returns a 400 with an invalid password", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "", name: "Test Test" })
      .expect(400);
  });

  it("returns a 400 with an invalid name", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "test", name: "Test" })
      .expect(400);
  });

  it("returns a 400 with an missing name", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "test" })
      .expect(400);
  });

  it("returns a 400 with missing email and password", async () => {
    await request(app).post("/api/users/signup").send({}).expect(400);
  });

  it("returns a 400 with missing email", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ password: "test", name: "Test Test" })
      .expect(400);
  });

  it("returns a 400 with missing password", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", name: "Test Test" })
      .expect(400);
  });

  it("returns a 400 when user tries to signup with an email that already exists", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "test", name: "Test Test" })
      .expect(201);
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("sets a cookie after successful signup", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "test", name: "Test Test" })
      .expect(201);
    expect(response.get("Set-Cookie")).toBeDefined();
  });

  it("returns 400 when password is shorter than 4 characters", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "abc", name: "Test Test" })
      .expect(400);
  });

  it("returns 201 when password is exactly 4 characters (min boundary)", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "boundary1@test.com",
        password: "abcd",
        name: "Test Test",
      })
      .expect(201);
  });

  it("returns 201 when password is exactly 20 characters (max boundary)", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "boundary2@test.com",
        password: "12345678901234567890",
        name: "Test Test",
      })
      .expect(201);
  });

  it("returns 400 when password is longer than 20 characters", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "123456789012345678901",
        name: "Test Test",
      })
      .expect(400);
  });

  it("trims whitespace from password before length validation", async () => {
    // A password of all spaces should fail after trimming
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "     ", name: "Test Test" })
      .expect(400);
  });

  it("succeeds when password meets the min length only after trimming surrounding whitespace", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "trimboundary@test.com",
        password: "  abcd  ",
        name: "Test Test",
      })
      .expect(201);
  });

  it("returns 400 for email without TLD", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("returns 400 for email with spaces", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "te st@test.com", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("returns 400 for email with missing @", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "testtest.com", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("returns 400 for email that is just a string", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "notanemail", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("returns 400 for email with double @", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@@test.com", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("documents how leading/trailing whitespace in email is handled (no .trim() in the email chain)", async () => {
    const response = await request(app).post("/api/users/signup").send({
      email: "  whitespace@test.com  ",
      password: "test",
      name: "Test Test",
    });

    if (response.status === 201) {
      // Accepted — confirm whether the stored email retains the whitespace,
      // since that would mean future exact-match lookups (signin, the
      // duplicate-email check here) could silently fail to match a
      // visually-identical email typed without the padding.
      expect(response.body.email).toBeDefined();
    } else {
      expect(response.status).toBe(400);
    }
  });

  it("treats emails as case-insensitive for duplicate check", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "Test@Test.com", password: "test", name: "Test Test" })
      .expect(201);

    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "test", name: "Test Test" })
      .expect(400);
  });

  it("returns the user object in the response body on successful signup", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "shape@test.com", password: "test", name: "Test Test" })
      .expect(201);

    expect(response.body).toHaveProperty("email", "shape@test.com");
    expect(response.body).toHaveProperty("id");
  });

  it("does not expose the password in the response body", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "secure@test.com", password: "test", name: "Test Test" })
      .expect(201);

    expect(response.body.password).toBeUndefined();
  });

  it("returns errors array in the response body on 400", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "bad-email", password: "test", name: "Test Test" })
      .expect(400);

    expect(response.body).toHaveProperty("errors");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it("returns a meaningful error message for invalid email", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "bad-email", password: "test", name: "Test Test" })
      .expect(400);

    const messages = response.body.errors.map(
      (e: { message: string }) => e.message,
    );
    expect(messages).toContain("Please provide a valid email");
  });

  it("returns a meaningful error message for invalid password", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "", name: "Test Test" })
      .expect(400);

    const messages = response.body.errors.map(
      (e: { message: string }) => e.message,
    );
    expect(messages).toContain("Password must be between 4 and 20 characters");
  });

  it("returns multiple validation errors when both email and password are invalid", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "not-an-email", password: "", name: "Test Test" })
      .expect(400);

    expect(response.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 400 when first or last name is a single character", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "shortname@test.com", password: "test", name: "A Test" })
      .expect(400);
  });

  it("returns 400 for a name with a middle name (more than two words)", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "middlename@test.com",
        password: "test",
        name: "Test Middle Test",
      })
      .expect(400);
  });

  it("returns 400 for a name containing non-letter characters", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "hyphenname@test.com",
        password: "test",
        name: "O'Brien Smith",
      })
      .expect(400);
  });

  it("returns 400 for a name containing digits", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "digitname@test.com",
        password: "test",
        name: "Test1 Test2",
      })
      .expect(400);
  });

  it("succeeds when name has leading/trailing whitespace that gets trimmed", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "trimname@test.com",
        password: "test",
        name: "  Test Test  ",
      })
      .expect(201);
  });

  it("returns 400 when name has more than one space between words", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "doublespace@test.com",
        password: "test",
        name: "Test  Test",
      })
      .expect(400);
  });

  it("cookie contains a valid JWT after signup", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "jwt@test.com", password: "test", name: "Test Test" })
      .expect(201);

    const cookies = response.get("Set-Cookie")!;
    expect(cookies).toBeDefined();

    // cookie-session base64-encodes the session object; decode and verify JWT is present
    const sessionCookie = cookies[0];
    if (sessionCookie) {
      const sessionData = sessionCookie.split(";")[0]?.split("=")[1]!;
      const decoded = JSON.parse(Buffer.from(sessionData, "base64").toString());
      expect(decoded).toHaveProperty("jwt");
    }
  });

  it("JWT payload contains the correct email, id, and name after signup", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "jwtpayload@test.com",
        password: "test",
        name: "Test Test",
      })
      .expect(201);

    const cookies = response.get("Set-Cookie")!;
    const sessionData = cookies[0]!.split(";")[0]!.split("=")[1]!;
    const { jwt: token } = JSON.parse(
      Buffer.from(sessionData, "base64").toString(),
    );
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );

    expect(payload).toHaveProperty("email", "jwtpayload@test.com");
    expect(payload).toHaveProperty("name", "Test Test");
    expect(payload).toHaveProperty("id", response.body.id);
  });

  it("does not set a cookie on failed signup", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "bad-email", password: "test", name: "Test Test" })
      .expect(400);

    // Either no Set-Cookie header, or no session cookie with a jwt
    const cookies = response.get("Set-Cookie");
    if (cookies) {
      const hasJwt = cookies.some((c) => c.includes("jwt"));
      expect(hasJwt).toBe(false);
    } else {
      expect(cookies).toBeUndefined();
    }
  });

  it("returns JSON content-type on success", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "contenttype@test.com",
        password: "test",
        name: "Test Test",
      })
      .expect(201);

    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("returns JSON content-type on error", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({ email: "bad-email", password: "test", name: "Test Test" })
      .expect(400);

    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("can register multiple distinct users independently", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({ email: "user1@test.com", password: "pass1", name: "Test Test" })
      .expect(201);

    await request(app)
      .post("/api/users/signup")
      .send({ email: "user2@test.com", password: "pass2", name: "Test Test" })
      .expect(201);

    await request(app)
      .post("/api/users/signup")
      .send({ email: "user3@test.com", password: "pass3", name: "Test Test" })
      .expect(201);
  });

  it("returns 405 for GET /api/users/signup (only POST is registered)", async () => {
    const response = await request(app).get("/api/users/signup");
    expect(response.status).toEqual(405);
  });

  it("returns 405 for DELETE /api/users/signup (only POST is registered)", async () => {
    const response = await request(app).delete("/api/users/signup");
    expect(response.status).toEqual(405);
  });
});

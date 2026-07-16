import request from "supertest";
import { app } from "../../app";
import { User } from "../../models/user.model";
import { Password } from "../../services/password";

describe("signin flow - ", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 on successful signin", async () => {
    await global.signin();
  });

  it("returns the user object in the response body on successful signin", async () => {
    // global.signin() doesn't expose the raw response body, so we need
    // to call the route directly to assert on the response shape
    await global.signin("shape@test.com", "validpass");

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "shape@test.com", password: "validpass" })
      .expect(200);

    expect(response.body).toHaveProperty("email", "shape@test.com");
    expect(response.body).toHaveProperty("id");
  });

  it("does not expose the password in the response body", async () => {
    await global.signin("secure@test.com", "validpass");

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "secure@test.com", password: "validpass" })
      .expect(200);

    expect(response.body.password).toBeUndefined();
  });

  it("returns 400 with missing email", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({ password: "validpass" })
      .expect(400);
  });

  it("returns 400 with missing password", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com" })
      .expect(400);
  });

  it("returns 400 with missing email and password", async () => {
    await request(app).post("/api/users/signin").send({}).expect(400);
  });

  it("returns 400 with an invalid email format", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({ email: "not-an-email", password: "validpass" })
      .expect(400);
  });

  it("returns 400 with a whitespace-only password (trimmed to empty)", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "     " })
      .expect(400);
  });

  it("returns 400 with an empty password string", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "" })
      .expect(400);
  });

  it("returns 400 when password is sent as a non-string value", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: 123456 })
      .expect((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("returns errors array in the response body on 400", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "bad-email", password: "validpass" })
      .expect(400);

    expect(response.body).toHaveProperty("errors");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it("returns a meaningful error message for invalid email format", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "bad-email", password: "validpass" })
      .expect(400);

    const messages = response.body.errors.map(
      (e: { message: string }) => e.message,
    );
    expect(messages).toContain("Please provide a valid email");
  });

  it("returns a meaningful error message for missing password", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "" })
      .expect(400);

    const messages = response.body.errors.map(
      (e: { message: string }) => e.message,
    );
    expect(messages).toContain("Password is required");
  });

  it("returns multiple validation errors when both email and password are invalid", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "bad-email", password: "" })
      .expect(400);

    expect(response.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 400 when signing in with a non-existent email", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({ email: "ghost@test.com", password: "validpass" })
      .expect(400);
  });

  it("returns 400 when signing in with the correct email but wrong password", async () => {
    await global.signin("test@test.com", "correctpassword");

    await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "wrongpassword" })
      .expect(400);
  });

  it("uses a generic 'Invalid credentials' message for non-existent user (no user enumeration)", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "ghost@test.com", password: "validpass" })
      .expect(400);

    const messages = response.body.errors.map(
      (e: { message: string }) => e.message,
    );
    expect(messages).toContain("Invalid credentials");
  });

  it("uses a generic 'Invalid credentials' message for wrong password (no user enumeration)", async () => {
    await global.signin("test@test.com", "correctpassword");

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "wrongpassword" })
      .expect(400);

    const messages = response.body.errors.map(
      (e: { message: string }) => e.message,
    );
    expect(messages).toContain("Invalid credentials");
  });

  it("is case-sensitive for passwords (wrong case returns 400)", async () => {
    await global.signin("test@test.com", "MyPassword");

    await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "mypassword" })
      .expect(400);
  });

  it("does not trim whitespace from password — fails with padded wrong password (exact match required)", async () => {
    // A password stored without whitespace should not match one typed with surrounding whitespace
    await global.signin("signin-test@test.com", "validpass");

    // Trying to signin with the same credentials but surrounded by whitespace should fail
    // because we preserve the exact input value, not trim it
    await request(app)
      .post("/api/users/signin")
      .send({ email: "signin-test@test.com", password: "  validpass  " })
      .expect(400);
  });

  it("succeeds with exact password input including trailing whitespace (not trimmed)", async () => {
    // First register a user with a password that has trailing whitespace
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "trailing-whitespace@test.com",
        password: "validpass ",
        name: "Test Test",
      })
      .expect(201);

    // Signin with EXACT same password including trailing whitespace succeeds
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "trailing-whitespace@test.com", password: "validpass " })
      .expect(200);

    expect(response.body.email).toBe("trailing-whitespace@test.com");
  });

  it("sets a cookie after successful signin", async () => {
    const cookie = await global.signin();
    expect(cookie).toBeDefined();
    expect(cookie.length).toBeGreaterThan(0);
  });

  it("cookie contains a valid JWT after signin", async () => {
    const cookie = await global.signin();

    const sessionData = cookie[0]!.split(";")[0]!.split("=")[1]!;
    const decoded = JSON.parse(Buffer.from(sessionData, "base64").toString());
    expect(decoded).toHaveProperty("jwt");
  });

  it("JWT payload contains the correct email", async () => {
    const cookie = await global.signin("payload@test.com", "validpass");

    const sessionData = cookie[0]!.split(";")[0]!.split("=")[1]!;
    const { jwt: token } = JSON.parse(
      Buffer.from(sessionData, "base64").toString(),
    );
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );

    expect(payload).toHaveProperty("email", "payload@test.com");
    expect(payload).toHaveProperty("id");
  });

  it("JWT payload contains the correct name", async () => {
    const cookie = await global.signin(
      "namecheck@test.com",
      "validpass",
      "Name Check",
    );

    const sessionData = cookie[0]!.split(";")[0]!.split("=")[1]!;
    const { jwt: token } = JSON.parse(
      Buffer.from(sessionData, "base64").toString(),
    );
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );

    expect(payload).toHaveProperty("name", "Name Check");
  });

  it("JWT has an expiry (exp claim) set", async () => {
    const cookie = await global.signin("expiry@test.com", "validpass");

    const sessionData = cookie[0]!.split(";")[0]!.split("=")[1]!;
    const { jwt: token } = JSON.parse(
      Buffer.from(sessionData, "base64").toString(),
    );
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );

    expect(payload).toHaveProperty("exp");
    const oneHourFromNow = Math.floor(Date.now() / 1000) + 3600;
    expect(payload.exp).toBeLessThanOrEqual(oneHourFromNow);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("does not set a cookie on failed signin", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "ghost@test.com", password: "validpass" })
      .expect(400);

    const cookies = response.get("Set-Cookie");
    if (cookies) {
      expect(cookies.some((c) => c.includes("jwt"))).toBe(false);
    } else {
      expect(cookies).toBeUndefined();
    }
  });

  it("signin overwrites an existing session cookie (re-signin gets a fresh JWT)", async () => {
    jest.setTimeout(15000);

    await global.signin("relogin@test.com", "validpass");

    const first = await request(app)
      .post("/api/users/signin")
      .send({ email: "relogin@test.com", password: "validpass" })
      .expect(200);

    await new Promise((res) => setTimeout(res, 1100));

    const second = await request(app)
      .post("/api/users/signin")
      .send({ email: "relogin@test.com", password: "validpass" })
      .expect(200);

    const extractPayload = (response: typeof first) => {
      const cookies = response.get("Set-Cookie")!;
      const sessionData = cookies[0]!.split(";")[0]!.split("=")[1]!;
      const { jwt: token } = JSON.parse(
        Buffer.from(sessionData, "base64").toString(),
      );
      return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    };

    const firstPayload = extractPayload(first);
    const secondPayload = extractPayload(second);

    expect(firstPayload.email).toEqual(secondPayload.email);
    expect(firstPayload.id).toEqual(secondPayload.id);
    expect(secondPayload.iat).toBeGreaterThan(firstPayload.iat);
    expect(secondPayload.exp).toBeGreaterThan(firstPayload.exp);
  }, 15000);

  it("returns JSON content-type on success", async () => {
    const cookie = await global.signin("ct@test.com", "validpass");

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "ct@test.com", password: "validpass" })
      .set("Cookie", cookie)
      .expect(200);

    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("returns JSON content-type on error", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "bad-email", password: "validpass" })
      .expect(400);

    expect(response.headers["content-type"]).toMatch(/json/);
  });

  it("signin and signup return the same user id", async () => {
    // global.signin() does signup+signin internally — call /currentuser
    // with the returned cookie to confirm the id round-trips correctly
    const cookie = await global.signin("sameid@test.com", "mypassword");

    const fromSignin = await request(app)
      .post("/api/users/signin")
      .send({ email: "sameid@test.com", password: "mypassword" })
      .expect(200);

    const fromCookie = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie)
      .expect(200);

    expect(fromSignin.body.id).toEqual(fromCookie.body.currentUser.id);
  });

  it("multiple distinct users can each sign in independently", async () => {
    await global.signin("user1@test.com", "pass1111");
    await global.signin("user2@test.com", "pass2222");
  });

  it("user1's password does not work for user2's account", async () => {
    await global.signin("user1@test.com", "pass1111");
    await global.signin("user2@test.com", "pass2222");

    await request(app)
      .post("/api/users/signin")
      .send({ email: "user2@test.com", password: "pass1111" })
      .expect(400);
  });

  it("returns 400 when the password exceeds 50 characters", async () => {
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "test@test.com", password: "a".repeat(51) })
      .expect(400);

    const messages = response.body.errors.map(
      (error: { message: string }) => error.message,
    );
    expect(messages).toContain("Password must be between 1 and 50 characters");
  });

  it("accepts a password at the 50-character maximum boundary", async () => {
    const password = "a".repeat(50);
    await User.build({
      email: "max-password@test.com",
      password,
      name: "Maximum Password",
    }).save();

    await request(app)
      .post("/api/users/signin")
      .send({ email: "max-password@test.com", password })
      .expect(200);
  });

  it("finds an existing user when the signin email uses different casing", async () => {
    await global.signin("case-signin@test.com", "validpass");

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "CASE-SIGNIN@Test.COM", password: "validpass" })
      .expect(200);

    expect(response.body.email).toBe("case-signin@test.com");
  });

  it("returns invalid credentials when the stored password format is malformed", async () => {
    await User.collection.insertOne({
      email: "malformed@test.com",
      password: "not-a-valid-stored-hash",
      name: "Malformed Password",
    });

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "malformed@test.com", password: "validpass" })
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Invalid credentials" }),
      ]),
    );
  });

  it("returns 404 for unsupported signin methods", async () => {
    const response = await request(app).get("/api/users/signin").expect(404);

    expect(response.body).toEqual({
      errors: [{ message: "Route not found in auth service" }],
    });
  });

  it("returns a generic server error when the user lookup fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const findOneSpy = jest
      .spyOn(User, "findOne")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "failure@test.com", password: "validpass" })
      .expect(500);

    expect(response.body).toHaveProperty("errors");
    expect(findOneSpy).toHaveBeenCalledWith({ email: "failure@test.com" });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("returns a generic server error when password comparison fails unexpectedly", async () => {
    await User.build({
      email: "compare-failure@test.com",
      password: "validpass",
      name: "Compare Failure",
    }).save();

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const compareSpy = jest
      .spyOn(Password, "compare")
      .mockRejectedValueOnce(new Error("crypto unavailable"));

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "compare-failure@test.com", password: "validpass" })
      .expect(500);

    expect(response.body).toHaveProperty("errors");
    expect(compareSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("accepts a one-character password at the signin minimum boundary", async () => {
    await User.build({
      email: "minimum-password@test.com",
      password: "a",
      name: "Minimum Password",
    }).save();

    await request(app)
      .post("/api/users/signin")
      .send({ email: "minimum-password@test.com", password: "a" })
      .expect(200);
  });

  it("returns a server error when an existing user's password is non-string", async () => {
    await User.build({
      email: "numeric-signin@test.com",
      password: "validpass",
      name: "Numeric Signin",
    }).save();

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(app)
      .post("/api/users/signin")
      .send({ email: "numeric-signin@test.com", password: 123456 })
      .expect(500);

    expect(response.body).toHaveProperty("errors");
    expect(consoleSpy).toHaveBeenCalled();
  });
});

import request from "supertest";
import { app } from "../../app";
import { User } from "../../models/user.model";

describe("signup flow tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it("fails when password is all spaces", async () => {
    // A password of all spaces should fail - not trimmed
    await request(app)
      .post("/api/users/signup")
      .send({ email: "test@test.com", password: "     ", name: "Test Test" })
      .expect(400);
  });

  it("succeeds when password meets the min length and has surrounding whitespace (whitespace is preserved, not trimmed)", async () => {
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

  it("rejects emails with leading/trailing whitespace (no normalization, must be exact)", async () => {
    // Emails must not have surrounding whitespace - the validator regex
    // /[^\s@]+/ explicitly rejects spaces, and there is no .trim() in the chain
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "  whitespace@test.com  ",
        password: "test",
        name: "Test Test",
      })
      .expect(400);

    // Verify the error message references the email validation issue
    const response = await request(app).post("/api/users/signup").send({
      email: "  whitespace@test.com  ",
      password: "test",
      name: "Test Test",
    });

    expect(response.status).toBe(400);
    const messages = response.body.errors.map(
      (e: { message: string }) => e.message,
    );
    // Email validation errors typically reference email format issues
    expect(
      messages.some(
        (m: any) =>
          m.includes("Please provide a valid email") || m.includes("invalid"),
      ),
    ).toBe(true);
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
      .send({ email: "test@test.com", password: "1", name: "Test Test" })
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

  it("preserves password whitespace consistently - signup and signin use exact input values", async () => {
    // Register a user with password that has surrounding whitespace
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "whitespace@test.com",
        password: "  abcd  ",
        name: "Test Test",
      })
      .expect(201);

    // Sign in with the EXACT same password including whitespace (not trimmed)
    const response = await request(app)
      .post("/api/users/signin")
      .send({
        email: "whitespace@test.com",
        password: "  abcd  ",
        name: "Test Test",
      })
      .expect(200);

    expect(response.body.email).toBe("whitespace@test.com");
  });

  it("fails when signin uses trimmed version of a non-trimmed stored password", async () => {
    // Register with whitespace-padded password
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "trimcheck@test.com",
        password: "  abcd  ",
        name: "Test Test",
      })
      .expect(201);

    // Try to sign in with trimmed version - should fail because stored password has whitespace
    await request(app)
      .post("/api/users/signin")
      .send({ email: "trimcheck@test.com", password: "abcd" })
      .expect(400);
  });

  it("fails when signup uses an email that already exists", async () => {
    // First register with whitespace-padded password
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "trimcheck2@test.com",
        password: "  abcd  ",
        name: "Test Test",
      })
      .expect(201);

    // Try to register another user with the same email - should fail with 400
    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "trimcheck2@test.com",
        password: "abcd",
        name: "Test Test",
      })
      .expect(400);

    // Verify errors contain user-already-exists message from the same response
    expect(
      response.body.errors.some((e: any) =>
        e.message.includes("User with this email already exists"),
      ),
    ).toBe(true);
  });

  it("preserves trailing whitespace in password across signup and signin paths", async () => {
    // Test that a password with trailing whitespace is preserved exactly (not trimmed)
    const email = "whitespace-trailing@test.com";
    await request(app)
      .post("/api/users/signup")
      .send({ email, password: "abcd ", name: "Test Test" })
      .expect(201);

    // Sign in must use exact same input as signup (no trimming applied either way)
    const response = await request(app)
      .post("/api/users/signin")
      .send({ email, password: "abcd " })
      .expect(200);

    expect(response.body.email).toBe(email);
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

  it("returns normalized email and trimmed name after signup", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "Normalized@Test.COM",
        password: "validpass",
        name: "  Normalized User  ",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      email: "normalized@test.com",
      name: "Normalized User",
    });
  });

  it("maps a duplicate-key race during save to the existing-user response", async () => {
    const duplicateError = Object.assign(new Error("duplicate key"), {
      code: 11000,
    });
    const saveSpy = jest
      .spyOn(User.prototype, "save")
      .mockRejectedValueOnce(duplicateError);

    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "race@test.com",
        password: "validpass",
        name: "Race User",
      })
      .expect(400);

    expect(response.body).toEqual({
      errors: [
        {
          message: "User with this email already exists",
          field: "credentials",
        },
      ],
    });
    saveSpy.mockRestore();
  });

  it("returns a service error when saving the user fails unexpectedly", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const saveSpy = jest
      .spyOn(User.prototype, "save")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "failure@test.com",
        password: "validpass",
        name: "Failure User",
      })
      .expect(500);

    expect(response.body).toHaveProperty("errors");
    expect(saveSpy).toHaveBeenCalledTimes(1);
    saveSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("sets Allow: POST and a structured error for unsupported signup methods", async () => {
    const response = await request(app).put("/api/users/signup").expect(405);

    expect(response.headers.allow).toBe("POST");
    expect(response.body).toEqual({
      errors: [{ message: "Method not allowed" }],
    });
  });

  it("returns a generic server error when the duplicate lookup fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const findOneSpy = jest
      .spyOn(User, "findOne")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "lookup-failure@test.com",
        password: "validpass",
        name: "Lookup Failure",
      })
      .expect(500);

    expect(response.body).toHaveProperty("errors");
    expect(findOneSpy).toHaveBeenCalledWith({
      email: "lookup-failure@test.com",
    });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("returns 400 when signup password is not a string", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "numeric-password@test.com",
        password: 1234,
        name: "Numeric Password",
      })
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Password must be provided" }),
      ]),
    );
  });
});

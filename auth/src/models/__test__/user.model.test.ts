import { Password } from "../../services/password";
import { User } from "../user.model";

describe("User model", () => {
  it("builds a user through the typed build helper", () => {
    const user = User.build({
      email: "Test@Test.com",
      password: "validpass",
      name: "Test User",
    });

    expect(user).toBeInstanceOf(User);
    expect(user.email).toBe("test@test.com");
    expect(user.password).toBe("validpass");
    expect(user.name).toBe("Test User");
  });

  it("requires an email", async () => {
    const user = User.build({
      email: "",
      password: "validpass",
      name: "Test User",
    });

    await expect(user.save()).rejects.toMatchObject({
      errors: { email: expect.anything() },
    });
  });

  it("requires a password", async () => {
    const user = User.build({
      email: "test@test.com",
      password: "",
      name: "Test User",
    });

    await expect(user.save()).rejects.toMatchObject({
      errors: { password: expect.anything() },
    });
  });

  it("requires a name", async () => {
    const user = User.build({
      email: "test@test.com",
      password: "validpass",
      name: "",
    });

    await expect(user.save()).rejects.toMatchObject({
      errors: { name: expect.anything() },
    });
  });

  it.each([
    "plain-address",
    "missing-domain@",
    "@missing-local.test",
    "two@@symbols.test",
    "space @test.com",
  ])("rejects invalid email %s", async (email) => {
    const user = User.build({
      email,
      password: "validpass",
      name: "Test User",
    });

    await expect(user.save()).rejects.toMatchObject({
      errors: {
        email: expect.objectContaining({
          message: "Please provide a valid email",
        }),
      },
    });
  });

  it.each([
    "A User",
    "Test U",
    "Single",
    "Test Middle User",
    "Test  User",
    "Test-Name User",
    "Test User1",
  ])("rejects invalid name %s", async (name) => {
    const user = User.build({
      email: "test@test.com",
      password: "validpass",
      name,
    });

    await expect(user.save()).rejects.toMatchObject({
      errors: {
        name: expect.objectContaining({
          message:
            "Name must be in format 'firstName lastName' with each part at least 2 characters",
        }),
      },
    });
  });

  it("normalizes email case and trims the name before persistence", async () => {
    const user = User.build({
      email: "Mixed.Case@Test.COM",
      password: "validpass",
      name: "  Mixed Case  ",
    });

    await user.save();

    expect(user.email).toBe("mixed.case@test.com");
    expect(user.name).toBe("Mixed Case");
  });

  it("hashes the password before saving", async () => {
    const user = User.build({
      email: "hash@test.com",
      password: "validpass",
      name: "Hash Test",
    });

    await user.save();

    expect(user.password).not.toBe("validpass");
    await expect(Password.compare(user.password, "validpass")).resolves.toBe(
      true,
    );
  });

  it("does not hash an unchanged password again", async () => {
    const user = User.build({
      email: "unchanged@test.com",
      password: "validpass",
      name: "Hash Test",
    });

    await user.save();
    const firstHash = user.password;

    user.name = "Changed Name";
    await user.save();

    expect(user.password).toBe(firstHash);
  });

  it("rehashes the password when it is changed", async () => {
    const user = User.build({
      email: "changed@test.com",
      password: "oldpassword",
      name: "Hash Test",
    });

    await user.save();
    const firstHash = user.password;

    user.password = "newpassword";
    await user.save();

    expect(user.password).not.toBe(firstHash);
    await expect(Password.compare(user.password, "newpassword")).resolves.toBe(
      true,
    );
    await expect(Password.compare(user.password, "oldpassword")).resolves.toBe(
      false,
    );
  });

  it("serializes only id, email, and name", async () => {
    const user = User.build({
      email: "json@test.com",
      password: "validpass",
      name: "Json Test",
    });

    await user.save();

    expect(user.toJSON()).toEqual({
      id: user.id,
      email: "json@test.com",
      name: "Json Test",
    });
  });

  it("does not persist a version key", async () => {
    const user = User.build({
      email: "version@test.com",
      password: "validpass",
      name: "Version Test",
    });

    await user.save();

    const stored = await User.collection.findOne({ _id: user._id });
    expect(stored).not.toHaveProperty("__v");
  });

  it("enforces the unique email index", async () => {
    await User.init();

    await User.build({
      email: "unique@test.com",
      password: "validpass",
      name: "First User",
    }).save();

    await expect(
      User.build({
        email: "UNIQUE@test.com",
        password: "anotherpass",
        name: "Second User",
      }).save(),
    ).rejects.toMatchObject({ code: 11000 });
  });
});

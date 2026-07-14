import { Password } from "../password";

describe("Password service", () => {
  it("creates a salted hash rather than returning the plain password", async () => {
    const hash = await Password.toHash("validpass");

    expect(hash).not.toBe("validpass");
    expect(hash).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/);
  });

  it("uses a different salt for repeated hashes of the same password", async () => {
    const first = await Password.toHash("validpass");
    const second = await Password.toHash("validpass");

    expect(first).not.toBe(second);
  });

  it("matches the correct supplied password", async () => {
    const stored = await Password.toHash("validpass");

    await expect(Password.compare(stored, "validpass")).resolves.toBe(true);
  });

  it("rejects an incorrect supplied password", async () => {
    const stored = await Password.toHash("validpass");

    await expect(Password.compare(stored, "wrongpass")).resolves.toBe(false);
  });

  it.each(["", "hashonly", ".salt", "hash."])(
    "returns false for malformed stored value %j",
    async (stored) => {
      await expect(Password.compare(stored, "validpass")).resolves.toBe(false);
    },
  );

  it("returns false when the stored hash has a different byte length", async () => {
    await expect(
      Password.compare("aa.0011223344556677", "validpass"),
    ).resolves.toBe(false);
  });

  it("supports an empty password at the service layer", async () => {
    const stored = await Password.toHash("");

    await expect(Password.compare(stored, "")).resolves.toBe(true);
    await expect(Password.compare(stored, "not-empty")).resolves.toBe(false);
  });
});

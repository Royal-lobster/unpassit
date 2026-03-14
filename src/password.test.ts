import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { resolvePassword } from "./password.js";

describe("resolvePassword", () => {
  const originalEnv = process.env.UNLOCKIT_PASSWORD;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.UNLOCKIT_PASSWORD;
    } else {
      process.env.UNLOCKIT_PASSWORD = originalEnv;
    }
  });

  it("returns CLI flag value when provided", async () => {
    const pw = await resolvePassword("secret", false);
    assert.strictEqual(pw, "secret");
  });

  it("falls back to env var when no flag", async () => {
    process.env.UNLOCKIT_PASSWORD = "envpass";
    const pw = await resolvePassword(undefined, false);
    assert.strictEqual(pw, "envpass");
  });

  it("throws when no password and not a TTY", async () => {
    delete process.env.UNLOCKIT_PASSWORD;
    await assert.rejects(
      () => resolvePassword(undefined, false),
      { message: /No password provided/ }
    );
  });
});

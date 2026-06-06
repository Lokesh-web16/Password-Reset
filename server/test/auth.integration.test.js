import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { startServer, stopServer, clearUsers, api } from "./helpers.js";
import { hashToken, generateRawToken, tokenExpiryFromNow } from "../utils/token.js";

// Helpers to read/write the user directly in the DB during assertions.
let User;

before(async () => {
  await startServer();
  User = (await import("../models/User.js")).default;
});

after(async () => {
  await stopServer();
});

beforeEach(async () => {
  await clearUsers();
});

/** Seeds a user straight in the DB and returns it. */
async function createUser(email = "user@example.com", password = "oldpass123") {
  return User.create({
    email,
    password: await bcrypt.hash(password, 10),
  });
}

/** Puts a known raw token on a user and returns the raw value. */
async function giveToken(user, minutesValid = 15) {
  const raw = generateRawToken();
  user.resetToken = hashToken(raw);
  user.resetTokenExpiry = tokenExpiryFromNow(minutesValid);
  await user.save();
  return raw;
}

describe("health", () => {
  test("GET / returns service status", async () => {
    const { status, body } = await api("GET", "/");
    assert.equal(status, 200);
    assert.equal(body.service, "password-reset-api");
  });
});

describe("POST /api/auth/forgot-password", () => {
  test("missing email -> 400", async () => {
    const { status, body } = await api("POST", "/api/auth/forgot-password", {});
    assert.equal(status, 400);
    assert.match(body.message, /email is required/i);
  });

  test("unknown email -> 404 with error message", async () => {
    const { status, body } = await api("POST", "/api/auth/forgot-password", {
      email: "ghost@nowhere.com",
    });
    assert.equal(status, 404);
    assert.match(body.message, /no account/i);
  });

  test("known email -> 200 and stores a hashed token + expiry", async () => {
    await createUser("known@example.com");
    const { status, body } = await api("POST", "/api/auth/forgot-password", {
      email: "known@example.com",
    });
    assert.equal(status, 200);
    assert.match(body.message, /sent/i);

    const user = await User.findOne({ email: "known@example.com" });
    assert.ok(user.resetToken, "token should be stored");
    assert.ok(user.resetTokenExpiry, "expiry should be stored");
    assert.equal(user.resetToken.length, 64, "stored token should be a hash");
    assert.ok(user.resetTokenExpiry > new Date(), "expiry should be future");
  });

  test("email lookup is case-insensitive", async () => {
    await createUser("mixed@example.com");
    const { status } = await api("POST", "/api/auth/forgot-password", {
      email: "MIXED@EXAMPLE.COM",
    });
    assert.equal(status, 200);
  });
});

describe("GET /api/auth/verify-token/:token", () => {
  test("valid unexpired token -> 200 valid:true", async () => {
    const user = await createUser();
    const raw = await giveToken(user, 15);
    const { status, body } = await api("GET", `/api/auth/verify-token/${raw}`);
    assert.equal(status, 200);
    assert.equal(body.valid, true);
  });

  test("unknown token -> 400 valid:false", async () => {
    const { status, body } = await api(
      "GET",
      "/api/auth/verify-token/deadbeef"
    );
    assert.equal(status, 400);
    assert.equal(body.valid, false);
  });

  test("expired token -> 400", async () => {
    const user = await createUser();
    const raw = await giveToken(user, -1); // already expired
    const { status, body } = await api("GET", `/api/auth/verify-token/${raw}`);
    assert.equal(status, 400);
    assert.equal(body.valid, false);
  });
});

describe("POST /api/auth/reset-password/:token", () => {
  test("valid token -> 200, password changed, token cleared", async () => {
    const user = await createUser("reset@example.com", "oldpass123");
    const raw = await giveToken(user, 15);

    const { status, body } = await api(
      "POST",
      `/api/auth/reset-password/${raw}`,
      { password: "brandnew99" }
    );
    assert.equal(status, 200);
    assert.match(body.message, /successfully/i);

    const updated = await User.findOne({ email: "reset@example.com" });
    // Token must be cleared (single-use).
    assert.equal(updated.resetToken, null);
    assert.equal(updated.resetTokenExpiry, null);
    // New password must verify, old must not.
    assert.ok(await bcrypt.compare("brandnew99", updated.password));
    assert.equal(await bcrypt.compare("oldpass123", updated.password), false);
  });

  test("password too short -> 400", async () => {
    const user = await createUser();
    const raw = await giveToken(user, 15);
    const { status, body } = await api(
      "POST",
      `/api/auth/reset-password/${raw}`,
      { password: "123" }
    );
    assert.equal(status, 400);
    assert.match(body.message, /6 characters/i);
  });

  test("expired token -> 400 and password unchanged", async () => {
    const user = await createUser("exp@example.com", "oldpass123");
    const raw = await giveToken(user, -1);
    const { status } = await api(
      "POST",
      `/api/auth/reset-password/${raw}`,
      { password: "newpass123" }
    );
    assert.equal(status, 400);

    const updated = await User.findOne({ email: "exp@example.com" });
    assert.ok(await bcrypt.compare("oldpass123", updated.password));
  });

  test("invalid token -> 400", async () => {
    const { status } = await api(
      "POST",
      "/api/auth/reset-password/not-a-real-token",
      { password: "newpass123" }
    );
    assert.equal(status, 400);
  });

  test("token is single-use: reusing it -> 400", async () => {
    const user = await createUser("once@example.com");
    const raw = await giveToken(user, 15);

    const first = await api("POST", `/api/auth/reset-password/${raw}`, {
      password: "firstchange1",
    });
    assert.equal(first.status, 200);

    const second = await api("POST", `/api/auth/reset-password/${raw}`, {
      password: "secondchange2",
    });
    assert.equal(second.status, 400);
  });
});

describe("POST /api/auth/register", () => {
  test("creates a new account -> 201", async () => {
    const { status, body } = await api("POST", "/api/auth/register", {
      name: "New User",
      email: "new@example.com",
      password: "oldpass123",
    });
    assert.equal(status, 201);
    assert.equal(body.email, "new@example.com");

    const user = await User.findOne({ email: "new@example.com" });
    assert.ok(user, "user should exist in DB");
    // Password must be hashed, not stored in plaintext.
    assert.notEqual(user.password, "oldpass123");
    assert.ok(await bcrypt.compare("oldpass123", user.password));
  });

  test("duplicate email -> 409", async () => {
    await createUser("dupe@example.com");
    const { status, body } = await api("POST", "/api/auth/register", {
      name: "Dupe",
      email: "dupe@example.com",
      password: "oldpass123",
    });
    assert.equal(status, 409);
    assert.match(body.message, /already exists/i);
  });

  test("missing fields -> 400", async () => {
    const { status } = await api("POST", "/api/auth/register", {
      email: "nopass@example.com",
    });
    assert.equal(status, 400);
  });

  test("invalid email -> 400", async () => {
    const { status } = await api("POST", "/api/auth/register", {
      email: "not-an-email",
      password: "oldpass123",
    });
    assert.equal(status, 400);
  });

  test("short password -> 400", async () => {
    const { status } = await api("POST", "/api/auth/register", {
      email: "shortpw@example.com",
      password: "123",
    });
    assert.equal(status, 400);
  });

  test("email is normalized to lowercase", async () => {
    const { status } = await api("POST", "/api/auth/register", {
      email: "MixedCase@Example.com",
      password: "oldpass123",
    });
    assert.equal(status, 201);
    const user = await User.findOne({ email: "mixedcase@example.com" });
    assert.ok(user);
  });
});

describe("end-to-end: register -> forgot -> reset", () => {
  test("a registered user can complete the reset flow", async () => {
    // 1. Register through the real endpoint.
    const reg = await api("POST", "/api/auth/register", {
      name: "Flow",
      email: "flow@example.com",
      password: "oldpass123",
    });
    assert.equal(reg.status, 201);

    // 2. Request a reset.
    const forgot = await api("POST", "/api/auth/forgot-password", {
      email: "flow@example.com",
    });
    assert.equal(forgot.status, 200);

    // 3. Simulate the emailed token by setting a known one.
    const user = await User.findOne({ email: "flow@example.com" });
    const raw = await giveToken(user, 15);

    // 4. Reset the password.
    const reset = await api("POST", `/api/auth/reset-password/${raw}`, {
      password: "freshpass123",
    });
    assert.equal(reset.status, 200);

    const after = await User.findOne({ email: "flow@example.com" });
    assert.ok(await bcrypt.compare("freshpass123", after.password));
    assert.equal(after.resetToken, null);
  });
});

describe("POST /api/auth/seed (test/dev only)", () => {
  test("creates a user -> 201", async () => {
    const { status, body } = await api("POST", "/api/auth/seed", {
      email: "seed@example.com",
      password: "oldpass123",
    });
    assert.equal(status, 201);
    assert.equal(body.email, "seed@example.com");
  });

  test("duplicate email -> 409", async () => {
    await createUser("dup@example.com");
    const { status } = await api("POST", "/api/auth/seed", {
      email: "dup@example.com",
      password: "oldpass123",
    });
    assert.equal(status, 409);
  });

  test("missing fields -> 400", async () => {
    const { status } = await api("POST", "/api/auth/seed", {
      email: "nopass@example.com",
    });
    assert.equal(status, 400);
  });
});

describe("end-to-end happy path", () => {
  test("seed -> forgot -> verify -> reset works together", async () => {
    // 1. Seed a user.
    const seed = await api("POST", "/api/auth/seed", {
      email: "e2e@example.com",
      password: "oldpass123",
    });
    assert.equal(seed.status, 201);

    // 2. Request a reset.
    const forgot = await api("POST", "/api/auth/forgot-password", {
      email: "e2e@example.com",
    });
    assert.equal(forgot.status, 200);

    // 3. Pull the raw token by re-deriving via a fresh known token (the raw
    //    value only lived in the email). We simulate the click by issuing a
    //    new known token directly, matching what the controller stored.
    const user = await User.findOne({ email: "e2e@example.com" });
    const raw = await giveToken(user, 15);

    // 4. Verify the link.
    const verify = await api("GET", `/api/auth/verify-token/${raw}`);
    assert.equal(verify.status, 200);

    // 5. Reset the password.
    const reset = await api("POST", `/api/auth/reset-password/${raw}`, {
      password: "freshpass123",
    });
    assert.equal(reset.status, 200);

    // 6. Confirm the new password and cleared token.
    const after = await User.findOne({ email: "e2e@example.com" });
    assert.ok(await bcrypt.compare("freshpass123", after.password));
    assert.equal(after.resetToken, null);
  });
});

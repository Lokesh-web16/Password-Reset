import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateRawToken,
  hashToken,
  tokenExpiryFromNow,
} from "../utils/token.js";

describe("token util (unit)", () => {
  test("generateRawToken returns a 64-char hex string", () => {
    const token = generateRawToken();
    assert.equal(typeof token, "string");
    assert.equal(token.length, 64); // 32 bytes -> 64 hex chars
    assert.match(token, /^[0-9a-f]+$/);
  });

  test("generateRawToken is random (no collisions across many calls)", () => {
    const set = new Set();
    for (let i = 0; i < 1000; i++) set.add(generateRawToken());
    assert.equal(set.size, 1000);
  });

  test("hashToken is deterministic for the same input", () => {
    const raw = "abc123";
    assert.equal(hashToken(raw), hashToken(raw));
  });

  test("hashToken produces different output for different input", () => {
    assert.notEqual(hashToken("one"), hashToken("two"));
  });

  test("hashToken output is a 64-char sha256 hex digest", () => {
    const hash = hashToken("anything");
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]+$/);
  });

  test("hashToken never equals the raw token (not stored in plaintext)", () => {
    const raw = generateRawToken();
    assert.notEqual(hashToken(raw), raw);
  });

  test("tokenExpiryFromNow returns a future Date for positive minutes", () => {
    const expiry = tokenExpiryFromNow(15);
    assert.ok(expiry instanceof Date);
    assert.ok(expiry.getTime() > Date.now());
  });

  test("tokenExpiryFromNow(15) is ~15 minutes ahead", () => {
    const before = Date.now();
    const expiry = tokenExpiryFromNow(15);
    const diffMin = (expiry.getTime() - before) / 60000;
    assert.ok(diffMin > 14.9 && diffMin < 15.1);
  });

  test("tokenExpiryFromNow with negative minutes yields a past Date", () => {
    const expiry = tokenExpiryFromNow(-1);
    assert.ok(expiry.getTime() < Date.now());
  });
});

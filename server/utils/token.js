import crypto from "crypto";

/**
 * Generates a cryptographically random reset token (the raw value emailed to
 * the user). 32 bytes -> 64 hex characters.
 */
export const generateRawToken = () => crypto.randomBytes(32).toString("hex");

/**
 * Hashes a raw reset token so the plaintext value is never stored in the DB.
 * Deterministic SHA-256 so the same raw token always maps to the same hash for
 * lookup at verification time.
 */
export const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");

/**
 * Computes the expiry Date for a reset token given a lifetime in minutes.
 */
export const tokenExpiryFromNow = (minutes) =>
  new Date(Date.now() + minutes * 60 * 1000);

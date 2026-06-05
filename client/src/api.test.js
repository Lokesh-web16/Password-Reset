import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  requestPasswordReset,
  verifyResetToken,
  submitNewPassword,
} from "./api.js";

describe("api helper", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const okResponse = (data) => ({
    ok: true,
    json: async () => data,
  });
  const errResponse = (data) => ({
    ok: false,
    json: async () => data,
  });

  test("requestPasswordReset posts the email and returns data", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ message: "sent" }));
    const result = await requestPasswordReset("a@b.com");

    expect(result.message).toBe("sent");
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/forgot-password$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ email: "a@b.com" });
  });

  test("verifyResetToken hits the verify endpoint with the token", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ valid: true }));
    const result = await verifyResetToken("abc123");

    expect(result.valid).toBe(true);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/verify-token\/abc123$/);
    expect(options.method).toBe("GET");
  });

  test("submitNewPassword posts the password to the token endpoint", async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ message: "done" }));
    await submitNewPassword("tok99", "secret123");

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/reset-password\/tok99$/);
    expect(JSON.parse(options.body)).toEqual({ password: "secret123" });
  });

  test("throws with the server message on a non-ok response", async () => {
    global.fetch.mockResolvedValueOnce(
      errResponse({ message: "No account found." })
    );
    await expect(requestPasswordReset("x@y.com")).rejects.toThrow(
      /no account found/i
    );
  });

  test("throws a generic message when the error body has none", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("no json");
      },
    });
    await expect(requestPasswordReset("x@y.com")).rejects.toThrow(
      /request failed/i
    );
  });
});

import mongoose from "mongoose";
import { createApp } from "../app.js";

// A dedicated test database so we never touch development data.
const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI ||
  "mongodb://127.0.0.1:27017/password_reset_jest";

let server;
let baseUrl;

/**
 * Connects to the test DB and starts the Express app on a random free port.
 * Returns the base URL (e.g. http://127.0.0.1:54321) for fetch calls.
 */
export async function startServer() {
  await mongoose.connect(TEST_MONGO_URI);
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve); // port 0 = OS picks free port
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  return baseUrl;
}

/** Drops the test DB and shuts everything down. */
export async function stopServer() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

/** Removes all users between tests for isolation. */
export async function clearUsers() {
  const { default: User } = await import("../models/User.js");
  await User.deleteMany({});
}

/** Small JSON fetch helper returning { status, body }. */
export async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed = {};
  try {
    parsed = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, body: parsed };
}

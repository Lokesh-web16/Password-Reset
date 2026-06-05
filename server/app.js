import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";

/**
 * Builds and returns the configured Express app WITHOUT starting a listener or
 * connecting to the database. Keeping this separate from server.js lets the
 * test suite import the app (and supply its own DB) without opening a port.
 */
export const createApp = () => {
  const app = express();

  // Render (and most hosts) put the app behind a reverse proxy, so the real
  // client IP arrives in the X-Forwarded-For header. Trusting the first proxy
  // hop lets express-rate-limit identify users correctly. Only enabled outside
  // of tests, where there is no proxy.
  if (process.env.NODE_ENV !== "test") {
    app.set("trust proxy", 1);
  }

  // --- Core middleware ---
  app.use(express.json());
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "*",
    })
  );

  // Limit how often the reset endpoints can be hit from one IP to slow abuse.
  // Disabled during tests so rapid sequential calls are not throttled.
  if (process.env.NODE_ENV !== "test") {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests. Please try again later." },
    });
    app.use("/api/auth", authLimiter);
  }

  // --- Routes ---
  app.get("/", (req, res) => {
    res.json({ status: "ok", service: "password-reset-api" });
  });

  app.use("/api/auth", authRoutes);

  return app;
};

export default createApp;

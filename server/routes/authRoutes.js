import express from "express";
import {
  forgotPassword,
  verifyResetToken,
  resetPassword,
  seedUser,
} from "../controllers/authController.js";

const router = express.Router();

// Request a reset link.
router.post("/forgot-password", forgotPassword);

// Check whether a reset link is still valid (used on reset page load).
router.get("/verify-token/:token", verifyResetToken);

// Submit the new password.
router.post("/reset-password/:token", resetPassword);

// Create a demo user for testing the flow.
router.post("/seed", seedUser);

export default router;

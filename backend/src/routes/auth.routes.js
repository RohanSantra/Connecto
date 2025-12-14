// src/routes/auth.routes.js
import express from "express";
import {
  sendOtp,
  resendOtp,
  cancelOtp,
  verifyOtp,
  checkAuth,
  refreshTokens,
  logout,
  googleRedirect,
  googleCallback
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ===============================
   🔹 AUTH ROUTES
   =============================== */

// Email / OTP flow
router.post("/send-otp", sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/cancel-otp", cancelOtp);
router.post("/verify-otp", verifyOtp);

// Google OAuth login
router.get("/google", googleRedirect);
router.get("/google/callback", googleCallback);

// Token validation and refresh
router.get("/check", authMiddleware, checkAuth);
router.post("/refresh", refreshTokens);

// Logout current session (requires valid access token)
router.post("/logout", authMiddleware, logout);

/* Optional — useful for health check */
router.get("/health", (req, res) => res.json({ status: "ok" }));

export default router;

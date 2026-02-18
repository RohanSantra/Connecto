import * as arctic from "arctic";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import dayjs from "dayjs";

import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Otp from "../models/otp.model.js";
import Session from "../models/session.model.js";
import Device from "../models/device.model.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  compareTokenHash,
} from "../utils/token.js";

import { sendOtpEmail } from "../services/email.js";
import { emitSocketEvent } from "../socket/index.js"; // ensure path matches your project
import { ChatEventEnum } from "../constants.js";

/* ----------------------------------------------------------
 * GOOGLE OAUTH
 * ---------------------------------------------------------- */
export const googleOAuth = new arctic.Google(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/* ----------------------------------------------------------
 * Cookie base data
 * ---------------------------------------------------------- */
const cookieBase = {
  httpOnly: true,
  secure: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};


/* ----------------------------------------------------------
 * SEND OTP
 * ---------------------------------------------------------- */
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email required");

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = dayjs().add(2, "minute").toDate();

  await Otp.findOneAndUpdate(
    { email },
    { otp: otpCode, attempts: 0, expiresAt },
    { upsert: true }
  );

  await sendOtpEmail({ to: email, otp: otpCode });

  return res.json(new ApiResponse(200, null, "OTP sent"));
});

/* ----------------------------------------------------------
 * RESEND OTP
 * ---------------------------------------------------------- */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email required");

  const record = await Otp.findOne({ email });
  if (!record) throw new ApiError(404, "OTP session not found");

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

  record.otp = newOtp;
  record.expiresAt = dayjs().add(2, "minute").toDate();
  record.attempts = 0;
  await record.save();

  await sendOtpEmail({ to: email, otp: newOtp });

  return res.json(new ApiResponse(200, null, "OTP resent"));
});

/* ----------------------------------------------------------
 * CANCEL OTP
 * ---------------------------------------------------------- */
export const cancelOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email required");

  await Otp.deleteMany({ email });

  return res.json(new ApiResponse(200, null, "OTP cancelled"));
});

/* ----------------------------------------------------------
 * VERIFY OTP → SIGNUP / LOGIN
 * ---------------------------------------------------------- */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, deviceId } = req.body;

  if (!email || !otp || !deviceId)
    throw new ApiError(400, "Email, OTP, deviceId required");

  const record = await Otp.findOne({ email });
  if (!record) throw new ApiError(404, "OTP not found");
  if (record.expiresAt < new Date()) throw new ApiError(400, "OTP expired");
  if (record.attempts >= 3) throw new ApiError(429, "Too many attempts");

  if (record.otp !== otp) {
    record.attempts++;
    await record.save();
    throw new ApiError(400, "Invalid OTP");
  }

  /* -----------------------------------------
     USER UPSERT
  ----------------------------------------- */
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      isVerified: true,
      lastLogin: new Date(),
    });
  } else {
    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();
  }

  await Otp.deleteMany({ email });

  /* -----------------------------------------
     SESSION (TIED TO DEVICE)
  ----------------------------------------- */
  const accessToken = generateAccessToken({ userId: user._id });
  const refreshToken = generateRefreshToken();
  const hashed = await hashToken(refreshToken);

  const expiresAt = dayjs().add(7, "days").toDate();

  let session = await Session.findOne({ userId: user._id, deviceId });

  if (!session) {
    await Session.create({
      userId: user._id,
      deviceId,
      hashedRefreshToken: hashed,
      expiresAt,
      revoked: false,
    });
  } else {
    session.hashedRefreshToken = hashed;
    session.expiresAt = expiresAt;
    session.revoked = false;
    await session.save();
  }

  /* -----------------------------------------
     COOKIES
  ----------------------------------------- */
  res.cookie("accessToken", accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.json(
    new ApiResponse(200, { user, accessToken }, "OTP verified")
  );
});


/* ----------------------------------------------------------
 * GOOGLE REDIRECT
 * ---------------------------------------------------------- */
export const googleRedirect = asyncHandler(async (req, res) => {
  const { deviceId, deviceName, publicKey } = req.query;

  if (!deviceId || !deviceName || !publicKey)
    throw new ApiError(400, "deviceId, deviceName, publicKey required");

  const state = arctic.generateState();
  const verifier = arctic.generateCodeVerifier();

  const url = googleOAuth.createAuthorizationURL(state, verifier, [
    "openid",
    "email",
    "profile",
  ]);

  url.searchParams.set("access_type", "offline");

  res.cookie("google_state", state, {
    ...cookieBase,
    sameSite: "lax",
    maxAge: 600_000,
  });

  res.cookie("google_verifier", verifier, {
    ...cookieBase,
    sameSite: "lax",
    maxAge: 600_000,
  });

  res.cookie(
    "google_device",
    JSON.stringify({ deviceId, deviceName, publicKey }),
    {
      ...cookieBase,
      sameSite: "lax",
      maxAge: 600_000,
    }
  );

  return res.redirect(url.toString());
});

/* ----------------------------------------------------------
 * GOOGLE CALLBACK
 * ---------------------------------------------------------- */
export const googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  const savedState = req.cookies.google_state;
  const verifier = req.cookies.google_verifier;
  const deviceInfo = req.cookies.google_device
    ? JSON.parse(req.cookies.google_device)
    : null;

  if (!code || !state || !verifier || !deviceInfo)
    throw new ApiError(400, "Invalid Google flow");

  if (state !== savedState) throw new ApiError(400, "Invalid OAuth state");

  const tokens = await googleOAuth.validateAuthorizationCode(code, verifier);
  const claims = arctic.decodeIdToken(tokens.idToken());

  if (!claims.email) throw new ApiError(400, "No Google email");

  const { deviceId, deviceName, publicKey } = deviceInfo;

  let user = await User.findOne({ email: claims.email });

  if (!user) {
    user = await User.create({
      email: claims.email,
      googleId: claims.sub,
      authProvider: "google",
      publicKey,
      isVerified: true,
      lastLogin: new Date(),
    });

  } else {
    // 🔥 NEW BLOCK
    if (user.isActive === false) {
      user.isActive = true;
      user.accountStatus = "active";
      user.deactivatedAt = null;
      await user.save();

      await Profile.updateOne(
        { userId: user._id },
        { isDeactivated: false, bio: "", lastSeen: null }
      );

      emitSocketEvent(
        req,
        "global",
        null,
        ChatEventEnum.USER_REACTIVATED_EVENT,
        {
          userId: user._id.toString(),
          timestamp: new Date(),
        }
      );
    }
    user.lastLogin = new Date();
    user.googleId = claims.sub;
    await user.save();
  }

  /* Device */
  let device = await Device.findOne({ userId: user._id, deviceId });

  if (!device) {
    const hasPrimary = await Device.exists({
      userId: user._id,
      isPrimary: true,
    });

    device = await Device.create({
      userId: user._id,
      deviceId,
      deviceName,
      publicKey,
      status: "active",
      isPrimary: !hasPrimary,
      lastSeen: new Date(),
    });
  } else {
    if (device.publicKey && device.publicKey !== publicKey) {
      // Allow update only if device was logged out
      if (device.status === "logged_out") {
        device.publicKey = publicKey;
      } else {
        throw new ApiError(403, "Device public key mismatch");
      }
    }

    device.status = "active";
    device.lastSeen = new Date();
    await device.save();
  }


  /* Session */
  const accessToken = generateAccessToken({ userId: user._id });
  const refreshToken = generateRefreshToken();
  const hashed = await hashToken(refreshToken);

  const expiresAt = dayjs().add(7, "days").toDate();

  let session = await Session.findOne({ userId: user._id, deviceId });

  if (!session) {
    await Session.create({
      userId: user._id,
      deviceId,
      hashedRefreshToken: hashed,
      expiresAt,
    });
  } else {
    session.hashedRefreshToken = hashed;
    session.expiresAt = expiresAt;
    session.revoked = false;
    await session.save();
  }

  res.cookie("accessToken", accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.clearCookie("google_state");
  res.clearCookie("google_verifier");
  res.clearCookie("google_device");

  return res.redirect(`${process.env.CLIENT_ORIGIN}/auth/success`);
});

/* ----------------------------------------------------------
 * CHECK AUTH
 * ---------------------------------------------------------- */
export const checkAuth = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  return res.json(
    new ApiResponse(
      200,
      { ...req.user, accessToken: req.cookies?.accessToken || null },
      "Authenticated"
    )
  );
});


/* ----------------------------------------------------------
 * REFRESH TOKENS
 * ---------------------------------------------------------- */
export const refreshTokens = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw new ApiError(401, "Refresh token missing");

  // Only fetch non-revoked AND non-expired sessions
  const sessions = await Session.find({
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).lean();

  let matched = null;

  for (const s of sessions) {
    if (await compareTokenHash(refreshToken, s.hashedRefreshToken)) {
      matched = s;
      break;
    }
  }

  if (!matched) throw new ApiError(401, "Invalid or expired refresh token");

  // Double check expiration (extra safety)
  if (matched.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  const newAccessToken = generateAccessToken({ userId: matched.userId });
  const newRefreshToken = generateRefreshToken();
  const hashed = await hashToken(newRefreshToken);

  await Session.updateOne(
    { _id: matched._id },
    {
      hashedRefreshToken: hashed,
      expiresAt: dayjs().add(7, "days").toDate(),
      revoked: false,
    }
  );

  res.cookie("accessToken", newAccessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", newRefreshToken, {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.json(
    new ApiResponse(200, { accessToken: newAccessToken }, "Token refreshed")
  );
});


/* ----------------------------------------------------------
 * LOGOUT
 * ---------------------------------------------------------- */
export const logout = asyncHandler(async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) throw new ApiError(400, "deviceId required");

  // 1️⃣ Mark device as logged_out — this is REQUIRED
  await Device.findOneAndUpdate(
    { userId: req.user._id, deviceId },
    { status: "logged_out", lastSeen: new Date() }
  );

  // 2️⃣ Revoke all sessions for this device
  await Session.updateMany({ userId: req.user._id, deviceId }, { revoked: true });

  // 3️⃣ If this is the last active device, mark user offline
  const activeDevices = await Device.countDocuments({
    userId: req.user._id,
    status: "active",
  });

  if (activeDevices === 0) {
    await Profile.updateOne(
      { userId: req.user._id },
      { isOnline: false, lastSeen: new Date() }
    );
  }

  // 4️⃣ Socket broadcast for this specific device
  emitSocketEvent(
    req,
    "user",
    req.user._id.toString(),
    ChatEventEnum.DEVICE_LOGGED_OUT_EVENT,
    {
      userId: req.user._id.toString(),
      deviceId,
      lastSeen: new Date(),
      timestamp: new Date(),
    }
  );

  // 5️⃣ Clear cookies
  res.clearCookie("accessToken", cookieBase);
  res.clearCookie("refreshToken", cookieBase);


  return res.json(new ApiResponse(200, null, "Logged out"));
});


// src/controllers/device.controller.js

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import Device from "../models/device.model.js";
import Session from "../models/session.model.js";

import mongoose from "mongoose";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";

/* ----------------------------------------------------------
   Base64 Normalizer (fixes spaces, URL-safe chars, padding)
---------------------------------------------------------- */
function normalizeBase64(str = "") {
  const noSpaces = str.replace(/\s+/g, "");
  const norm = noSpaces.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  return norm + "=".repeat(pad);
}

/* ==========================================================
   1️⃣ REGISTER DEVICE  — Final Clean Version
========================================================== */
export const registerDevice = asyncHandler(async (req, res) => {
  const { deviceId, deviceName, publicKey, preKeys, signedPreKey, isPrimary } =
    req.body;

  if (!deviceId || !publicKey)
    throw new ApiError(400, "deviceId and publicKey are required");

  // 🔐 Clean base64 key
  const cleanedKey = normalizeBase64(publicKey);

  if (!/^[A-Za-z0-9+/=]+$/.test(cleanedKey) || cleanedKey.length < 40) {
    console.error("❌ Invalid publicKey:", publicKey);
    throw new ApiError(400, "Invalid device public key");
  }

  const existing = await Device.findOne({
    userId: req.user._id,
    deviceId,
  });

  const userIdStr = req.user._id.toString();

  // Already active? refresh only
  if (existing && existing.status === "active") {
    existing.lastSeen = new Date();
    await existing.save();

    emitSocketEvent(
      req,
      "user",
      userIdStr,
      ChatEventEnum.DEVICE_REGISTERED_EVENT,
      {
        userId: userIdStr,
        deviceId,
        isPrimary: existing.isPrimary,
        lastSeen: existing.lastSeen,
        timestamp: new Date(),
      }
    );

    return res.json(
      new ApiResponse(200, existing, "Device already active (refreshed)")
    );
  }

  // Create or update device
  const device = await Device.findOneAndUpdate(
    { userId: req.user._id, deviceId },
    {
      userId: req.user._id,
      deviceId,
      deviceName: deviceName || "Unknown",
      publicKey: cleanedKey,
      preKeys: Array.isArray(preKeys) ? preKeys : [],
      signedPreKey: signedPreKey || null,
      isPrimary: !!isPrimary,
      status: "active",
      lastSeen: new Date(),
    },
    { upsert: true, new: true }
  );

  emitSocketEvent(
    req,
    "user",
    userIdStr,
    ChatEventEnum.DEVICE_REGISTERED_EVENT,
    {
      userId: userIdStr,
      deviceId: device.deviceId,
      isPrimary: device.isPrimary,
      lastSeen: device.lastSeen,
      timestamp: new Date(),
    }
  );

  return res.status(201).json(
    new ApiResponse(201, device, "Device registered successfully")
  );
});

/* ==========================================================
   2️⃣ GET ALL DEVICES FOR USER
========================================================== */
export const getDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });

  return res.json(new ApiResponse(200, devices, "Devices fetched"));
});

/* ==========================================================
   3️⃣ SET PRIMARY DEVICE
========================================================== */
export const setPrimaryDevice = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // reset all
    await Device.updateMany(
      { userId: req.user._id },
      { $set: { isPrimary: false } },
      { session }
    );

    const updated = await Device.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      { isPrimary: true, lastSeen: new Date() },
      { new: true, session }
    );

    if (!updated) throw new ApiError(404, "Device not found");

    await session.commitTransaction();

    emitSocketEvent(
      req,
      "user",
      req.user._id.toString(),
      ChatEventEnum.DEVICE_PRIMARY_CHANGED_EVENT,
      {
        userId: req.user._id.toString(),
        deviceId,
        isPrimary: true,
        timestamp: new Date(),
      }
    );

    return res.json(
      new ApiResponse(200, updated, "Primary device set successfully")
    );
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

/* ==========================================================
   4️⃣ LOGOUT DEVICE (soft)
========================================================== */
export const logoutDevice = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  const device = await Device.findOneAndUpdate(
    { userId: req.user._id, deviceId },
    { status: "logged_out", lastSeen: new Date() },
    { new: true }
  );

  if (!device) throw new ApiError(404, "Device not found");

  await Session.updateMany(
    { userId: req.user._id, deviceId },
    { revoked: true }
  );

  emitSocketEvent(
    req,
    "user",
    req.user._id.toString(),
    ChatEventEnum.DEVICE_LOGGED_OUT_EVENT,
    {
      userId: req.user._id.toString(),
      deviceId,
      lastSeen: device.lastSeen,
      timestamp: new Date(),
    }
  );

  return res.json(new ApiResponse(200, null, "Device logged out"));
});

/* ==========================================================
   5️⃣ DELETE DEVICE
========================================================== */
export const deleteDevice = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  const deleted = await Device.findOneAndDelete({
    userId: req.user._id,
    deviceId,
  });

  if (!deleted) throw new ApiError(404, "Device not found");

  await Session.deleteMany({ userId: req.user._id, deviceId });

  emitSocketEvent(
    req,
    "user",
    req.user._id.toString(),
    ChatEventEnum.DEVICE_REMOVED_EVENT,
    {
      userId: req.user._id.toString(),
      deviceId,
      timestamp: new Date(),
    }
  );

  return res.json(
    new ApiResponse(200, null, "Device removed permanently")
  );
});

/* ==========================================================
   6️⃣ ROTATE PREKEYS
========================================================== */
export const rotatePreKeys = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { preKeys, signedPreKey } = req.body;

  if (!Array.isArray(preKeys) || preKeys.length === 0)
    throw new ApiError(400, "preKeys required");

  const updated = await Device.findOneAndUpdate(
    { userId: req.user._id, deviceId },
    {
      preKeys,
      signedPreKey: signedPreKey || null,
      lastSeen: new Date(),
    },
    { new: true }
  );

  if (!updated) throw new ApiError(404, "Device not found");

  emitSocketEvent(
    req,
    "user",
    req.user._id.toString(),
    ChatEventEnum.DEVICE_KEYS_ROTATED_EVENT,
    {
      userId: req.user._id.toString(),
      deviceId,
      rotated: true,
      timestamp: new Date(),
    }
  );

  return res.json(
    new ApiResponse(200, updated, "Prekeys rotated successfully")
  );
});

/* ==========================================================
   7️⃣ ACTIVE DEVICE SYNC CHECK
========================================================== */
export const syncDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find({
    userId: req.user._id,
    status: "active",
  });

  return res.json(
    new ApiResponse(200, devices, "Active devices fetched")
  );
});

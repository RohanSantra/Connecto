// src/controllers/device.controller.js

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import Device from "../models/device.model.js";
import Session from "../models/session.model.js";

import mongoose from "mongoose";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";
import User from "../models/user.model.js";

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
  const { deviceId, deviceName, publicKey, preKeys, signedPreKey } = req.body;

  if (!deviceId || !publicKey)
    throw new ApiError(400, "deviceId and publicKey are required");

  const cleanedKey = normalizeBase64(publicKey);

  if (!/^[A-Za-z0-9+/=]+$/.test(cleanedKey) || cleanedKey.length < 40) {
    throw new ApiError(400, "Invalid device public key");
  }

  const userId = req.user._id;
  const userIdStr = userId.toString();

  let device = await Device.findOne({ userId, deviceId });

  const hasPrimary = await Device.exists({
    userId,
    isPrimary: true,
    status: "active",
  });

  if (device) {
    device.publicKey = cleanedKey;
    device.deviceName = deviceName || device.deviceName;
    device.preKeys = Array.isArray(preKeys) ? preKeys : device.preKeys;
    device.signedPreKey = signedPreKey || device.signedPreKey;
    device.status = "active";
    device.lastSeen = new Date();

    // 🔥 Promote if no active primary exists
    if (!hasPrimary) {
      device.isPrimary = true;
    }

    await device.save();
  } else {
    device = await Device.create({
      userId,
      deviceId,
      deviceName: deviceName || "Unknown",
      publicKey: cleanedKey,
      preKeys: Array.isArray(preKeys) ? preKeys : [],
      signedPreKey: signedPreKey || null,
      status: "active",
      isPrimary: !hasPrimary, // 🔥 KEY LINE
      lastSeen: new Date(),
    });
  }

  emitSocketEvent(
    req,
    "user",
    userIdStr,
    ChatEventEnum.DEVICE_REGISTERED_EVENT,
    {
      device,
      timestamp: new Date(),
    }
  );

  return res.status(201).json(
    new ApiResponse(201, device, "Device registered successfully")
  );
});



/* ==========================================================
   To store encryptedPrivateKey in database 
========================================================== */
export const backupPrivateKey = async (req, res) => {
  try {
    const userId = req.user._id;
    const { encryptedPrivateKey } = req.body;

    if (!encryptedPrivateKey) {
      return res.status(400).json({ message: "Missing encrypted key" });
    }

    await User.findByIdAndUpdate(userId, {
      encryptedPrivateKeyBackup: encryptedPrivateKey
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Backup failed" });
  }
};

/* ==========================================================
   To retrive encryptedPrivateKey from database for that user 
========================================================== */
export const getBackupPrivateKey = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("encryptedPrivateKeyBackup");

    res.json({
      data: {
        encryptedPrivateKey: user?.encryptedPrivateKeyBackup || null
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
};


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

// src/routes/device.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  registerDevice,
  getDevices,
  setPrimaryDevice,
  logoutDevice,
  deleteDevice,
  rotatePreKeys,
  syncDevices,
  backupPrivateKey,
  getBackupPrivateKey
} from "../controllers/devices.controller.js";

const router = express.Router();

// Register a new device
router.post("/register", authMiddleware, registerDevice);

// Backup and get private keys
router.post("/backup-key", authMiddleware, backupPrivateKey);
router.get("/backup-key", authMiddleware, getBackupPrivateKey);

// Get all user devices
router.get("/", authMiddleware, getDevices);

// Set primary device
router.patch("/:deviceId/primary", authMiddleware, setPrimaryDevice);

// Logout a device
router.post("/:deviceId/logout", authMiddleware, logoutDevice);

// Delete a device
router.delete("/:deviceId", authMiddleware, deleteDevice);

// Rotate prekeys
router.put("/:deviceId/prekeys", authMiddleware, rotatePreKeys);

// Sync active devices (multi-device future use)
router.get("/sync", authMiddleware, syncDevices);

export default router;

import express from "express";
import {
  setupProfile,
  getMyProfile,
  updateProfile,
  getProfileByUsername,
  searchProfiles,
  checkUsernameAvailability,
  updateAvatar,
  deleteProfile,
  updateOnlineStatus,
  getOnlineStatuses,
  getProfilesBulk
} from "../controllers/profile.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

// 🌱 Setup after OTP/Google login
router.post("/setup", authMiddleware, upload.single("avatar"), setupProfile);

// 👤 My profile
router.get("/me", authMiddleware, getMyProfile);
router.put("/update-profile", authMiddleware, updateProfile);

// 💬 Username availability + suggestions
router.get("/check-username/:username", authMiddleware, checkUsernameAvailability);

// 🧑‍🤝‍🧑 Public profile and search
router.get("/search", authMiddleware, searchProfiles);
router.get("/:username", authMiddleware, getProfileByUsername);
router.post("/bulk", authMiddleware, getProfilesBulk);


// 🖼️ Avatar upload (multer + cloudinary)
router.post("/update-avatar", authMiddleware, upload.single("avatar"), updateAvatar);

// ⚡ Online/offline status
router.patch("/status", authMiddleware, updateOnlineStatus);
router.post("/online-status", authMiddleware, getOnlineStatuses);

// ❌ Delete profile (soft)
router.delete("/delete", authMiddleware, deleteProfile);

export default router;

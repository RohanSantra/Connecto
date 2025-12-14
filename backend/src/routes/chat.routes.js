import express from "express";
import {
  createOneToOneChat,
  createGroupChat,
  renameGroup,
  updateGroupAvatar,
  addGroupMember,
  removeGroupMember,
  promoteMember,
  demoteMember,
  deleteChat,
  pinChat,
  unpinChat,
  getAllChats,
  getChatDetails,
  getGroupMembers,
  getChatDevices,
} from "../controllers/chat.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

/* ==========================================================
   🗨️ ONE-TO-ONE CHAT
   ========================================================== */
router.post("/one-to-one", authMiddleware, createOneToOneChat);

/* ==========================================================
   👥 GROUP CHAT CREATION
   ========================================================== */
router.post("/group", authMiddleware, createGroupChat);

/* ==========================================================
   ✏️ UPDATE GROUP INFO (name/settings)
   ========================================================== */
router.patch("/group/:chatId", authMiddleware, renameGroup);

/* ==========================================================
   🖼️ UPDATE GROUP AVATAR (Cloudinary)
   ========================================================== */
router.patch(
  "/group/:chatId/avatar",
  authMiddleware,
  upload.single("avatar"),
  updateGroupAvatar
);

/* ==========================================================
   👤 MEMBER MANAGEMENT (Add / Remove / Promote / Demote)
   ========================================================== */
router.post("/group/:chatId/members", authMiddleware, addGroupMember);
router.delete("/group/:chatId/members/:userId", authMiddleware, removeGroupMember);

// Promote or demote member role (admin/member)
router.post("/group/:chatId/members/promote", authMiddleware, promoteMember);
router.post("/group/:chatId/members/demote", authMiddleware, demoteMember);

/* ==========================================================
   🗑️ CHAT MANAGEMENT
   ========================================================== */
router.delete("/:chatId", authMiddleware, deleteChat);

/* ==========================================================
   📌 PIN / UNPIN CHAT
   ========================================================== */
router.put("/:chatId/pin", authMiddleware, pinChat);
router.put("/:chatId/unpin", authMiddleware, unpinChat);

/* ==========================================================
   📜 FETCH CHATS
   ========================================================== */
router.get("/", authMiddleware, getAllChats);
router.get("/:chatId", authMiddleware, getChatDetails);
router.get("/group/:chatId/members", authMiddleware, getGroupMembers);

/* ==========================================================
   📜 FETCH CHATS DEVICES
   ========================================================== */
router.get("/:chatId/devices",authMiddleware, getChatDevices);


export default router;

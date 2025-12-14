import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  sendMessage,
  editMessage,
  deleteMessage,
  getMessages,
  markAsDelivered,
  markAsRead,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  addReaction,
  removeReaction,
  getChatMedia,
  getChatDocuments,
  getReactions,
  clearChatForUser,
} from "../controllers/message.controller.js";

const router = express.Router();

// 📨 Send (text + attachments)
router.post("/send", authMiddleware, upload.array("attachments", 5), sendMessage);

// ✏️ Edit / Delete
router.put("/:messageId/edit", authMiddleware, editMessage);
router.delete("/:messageId", authMiddleware, deleteMessage);
router.patch("/:chatId/clear", authMiddleware, clearChatForUser);

// ✅ Delivered / Read
router.patch("/:chatId/delivered", authMiddleware, markAsDelivered);
router.patch("/:chatId/read", authMiddleware, markAsRead);

// 📄 Fetch messages and media
router.get("/:chatId", authMiddleware, getMessages);
router.get("/media/:chatId", authMiddleware, getChatMedia);
router.get("/docs/:chatId", authMiddleware, getChatDocuments);

// 📌 Pin / Unpin / Get pinned
router.post("/:chatId/pin/:messageId", authMiddleware, pinMessage);
router.delete("/:chatId/unpin/:messageId", authMiddleware, unpinMessage);
router.get("/:chatId/pinned", authMiddleware, getPinnedMessages);

// 💬 Reactions
router.get("/:messageId/reactions", authMiddleware, getReactions);
router.post("/:messageId/reaction", authMiddleware, addReaction);
router.delete("/:messageId/reaction", authMiddleware, removeReaction);

export default router;

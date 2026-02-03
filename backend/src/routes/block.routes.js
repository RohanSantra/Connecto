// src/routes/block.routes.js
import express from "express";
import { blockUser, unblockUser, blockChat, unblockChat, getMyBlocks } from "../controllers/block.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware); // all routes require auth

router.post("/users/:userId", blockUser);
router.delete("/users/:userId", unblockUser);

router.post("/chats/:chatId", blockChat);
router.delete("/chats/:chatId", unblockChat);

router.get("/", getMyBlocks);

export default router;

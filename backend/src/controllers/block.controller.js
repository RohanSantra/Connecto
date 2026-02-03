// src/controllers/block.controller.js
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Block from "../models/block.model.js";
import mongoose from "mongoose";
import { emitSocketEvent } from "../socket/index.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Chat from "../models/chat.model.js";
import ChatMember from "../models/chatMember.model.js";

/**
 * POST /blocks/users/:userId
 * Block a user
 */
export const blockUser = asyncHandler(async (req, res) => {
    const actorId = req.user._id.toString();
    const { userId } = req.params;

    if (!userId) throw new ApiError(400, "userId required");
    if (actorId === userId) throw new ApiError(400, "Cannot block yourself");

    const block = await Block.findOneAndUpdate(
        { blockedBy: actorId, blockedUser: userId, type: "user" },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    emitSocketEvent(req, "user", actorId, "BLOCK_LIST_UPDATED", {});
    emitSocketEvent(req, "user", userId, "YOU_WERE_BLOCKED", {
        by: actorId
    });

    return res.json(new ApiResponse(200, block, "User blocked"));
});

/**
 * DELETE /blocks/users/:userId
 */
export const unblockUser = asyncHandler(async (req, res) => {
    const actorId = req.user._id.toString();
    const { userId } = req.params;

    if (!userId) throw new ApiError(400, "userId required");

    await Block.deleteOne({ blockedBy: actorId, blockedUser: userId, type: "user" });

    emitSocketEvent(req, "user", actorId, "BLOCK_LIST_UPDATED", {});
    emitSocketEvent(req, "user", userId, "YOU_WERE_UNBLOCKED", {
        by: actorId
    });

    return res.json(new ApiResponse(200, null, "User unblocked"));
});

/**
 * POST /blocks/chats/:chatId
 * Block a chat (group)
 */
export const blockChat = asyncHandler(async (req, res) => {
    const actorId = req.user._id.toString();
    const { chatId } = req.params;

    if (!chatId) throw new ApiError(400, "chatId required");

    const block = await Block.findOneAndUpdate(
        { blockedBy: actorId, blockedChat: chatId, type: "chat" },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    emitSocketEvent(req, "user", actorId, "BLOCK_LIST_UPDATED", {});

    return res.json(new ApiResponse(200, block, "Chat blocked"));
});

/**
 * DELETE /blocks/chats/:chatId
 */
export const unblockChat = asyncHandler(async (req, res) => {
    const actorId = req.user._id.toString();
    const { chatId } = req.params;

    if (!chatId) throw new ApiError(400, "chatId required");

    await Block.deleteOne({ blockedBy: actorId, blockedChat: chatId, type: "chat" });

    emitSocketEvent(req, "user", actorId, "BLOCK_LIST_UPDATED", {});

    return res.json(new ApiResponse(200, null, "Chat unblocked"));
});

/**
 * GET /blocks
 * List blocks for current user
 */
export const getMyBlocks = asyncHandler(async (req, res) => {
    const actorId = req.user._id;

    const blocks = await Block.find({ blockedBy: actorId }).lean();

    const userBlocks = blocks.filter(b => b.type === "user" && b.blockedUser);
    const chatBlocks = blocks.filter(b => b.type === "chat" && b.blockedChat);

    /* ================= USERS ================= */
    const userIds = userBlocks.map(b => b.blockedUser);

    const profiles = await Profile.find({ userId: { $in: userIds } })
        .select("userId username avatarUrl isOnline lastSeen")
        .lean();

    const profileMap = {};
    profiles.forEach(p => profileMap[String(p.userId)] = p);

    const enrichedUsers = userBlocks.map(b => ({
        type: "user",
        blockedAt: b.createdAt,
        user: profileMap[String(b.blockedUser)] || {
            userId: b.blockedUser,
            username: "Unknown",
            avatarUrl: null
        }
    }));

    /* ================= CHATS ================= */
    const chatIds = chatBlocks.map(b => b.blockedChat);

    const chats = await Chat.find({ _id: { $in: chatIds } })
        .select("name groupAvatarUrl isGroup")
        .lean();

    const memberCounts = await ChatMember.aggregate([
        { $match: { chatId: { $in: chatIds } } },
        { $group: { _id: "$chatId", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    memberCounts.forEach(m => countMap[String(m._id)] = m.count);

    const chatMap = {};
    chats.forEach(c => chatMap[String(c._id)] = c);

    const enrichedChats = chatBlocks.map(b => ({
        type: "chat",
        blockedAt: b.createdAt,
        chat: {
            chatId: b.blockedChat,
            name: chatMap[String(b.blockedChat)]?.name || "Unknown Group",
            groupAvatarUrl: chatMap[String(b.blockedChat)]?.groupAvatarUrl || null,
            memberCount: countMap[String(b.blockedChat)] || 0
        }
    }));

    return res.json(new ApiResponse(200, {
        users: enrichedUsers,
        chats: enrichedChats
    }, "Blocks fetched"));
});

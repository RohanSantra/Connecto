// src/controllers/call.controller.js

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import Call from "../models/call.model.js";
import Chat from "../models/chat.model.js";
import ChatMember from "../models/chatMember.model.js";

import mongoose from "mongoose";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";

/* ==========================================================
   1️⃣ START CALL
========================================================== */
export const startCall = asyncHandler(async (req, res) => {
  const { chatId, type, metadata } = req.body;

  if (!chatId || !type) throw new ApiError(400, "chatId and type required");
  if (!["audio", "video"].includes(type))
    throw new ApiError(400, "Invalid call type");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  // Prevent multiple active calls
  const activeCall = await Call.findOne({
    chatId,
    status: { $in: ["ringing", "accepted"] }
  });

  if (activeCall)
    throw new ApiError(409, "A call is already active in this chat");

  // Load all chat members except the caller
  const members = await ChatMember.find({ chatId }).select("userId");
  const calleeIds = members
    .map((m) => m.userId.toString())
    .filter((id) => id !== req.user._id.toString());

  if (!calleeIds.length)
    throw new ApiError(400, "No valid participants to call");

  const call = await Call.create({
    chatId,
    callerId: req.user._id,
    calleeIds,
    type,
    status: "ringing",
    startedAt: new Date(),
    metadata,
  });

  // Emit to chat room (chat-level)
  emitSocketEvent(
    req,
    "chat",
    chatId,
    ChatEventEnum.CALL_RINGING_EVENT,
    {
      callId: call._id.toString(),
      chatId: chatId.toString(),
      type,
      callerId: req.user._id.toString(),
      calleeIds,
      metadata: metadata || null,
      timestamp: new Date(),
    }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, call, "Call initiated successfully"));
});

/* ==========================================================
   2️⃣ ACCEPT CALL
========================================================== */
export const acceptCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  if (call.status !== "ringing")
    throw new ApiError(400, "Call already handled");

  const callerIdStr = call.callerId?.toString?.() || String(call.callerId);
  const isParticipant = (call.calleeIds || []).map(String).includes(String(req.user._id));
  if (!isParticipant) throw new ApiError(403, "You are not a participant of this call");

  call.status = "accepted";
  call.startedAt = call.startedAt || new Date();
  await call.save();

  emitSocketEvent(
    req,
    "chat",
    call.chatId.toString(),
    ChatEventEnum.CALL_ACCEPTED_EVENT,
    {
      callId: call._id.toString(),
      userId: req.user._id.toString(),
      timestamp: new Date(),
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, call, "Call accepted"));
});

/* ==========================================================
   3️⃣ REJECT CALL
========================================================== */
export const rejectCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  if (["ended", "missed"].includes(call.status))
    throw new ApiError(400, "Call already ended");

  call.status = "rejected";
  call.endedAt = new Date();
  await call.save();

  emitSocketEvent(
    req,
    "chat",
    call.chatId.toString(),
    ChatEventEnum.CALL_REJECTED_EVENT,
    {
      callId: call._id.toString(),
      userId: req.user._id.toString(),
      timestamp: new Date(),
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, call, "Call rejected"));
});

/* ==========================================================
   4️⃣ END CALL
========================================================== */
export const endCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  if (call.status === "ended")
    throw new ApiError(400, "Call already ended");

  call.status = "ended";
  call.endedAt = new Date();
  call.duration = call.startedAt
    ? Math.floor((call.endedAt - call.startedAt) / 1000)
    : 0;

  await call.save();

  emitSocketEvent(
    req,
    "chat",
    call.chatId.toString(),
    ChatEventEnum.CALL_ENDED_EVENT,
    {
      callId: call._id.toString(),
      duration: call.duration,
      endedBy: req.user._id.toString(),
      timestamp: new Date(),
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, call, "Call ended"));
});

/* ==========================================================
   5️⃣ MARK MISSED CALL
========================================================== */
export const markMissedCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  call.status = "missed";
  call.endedAt = new Date();
  await call.save();

  emitSocketEvent(
    req,
    "chat",
    call.chatId.toString(),
    ChatEventEnum.CALL_MISSED_EVENT,
    {
      callId: call._id.toString(),
      userId: req.user._id.toString(),
      timestamp: new Date(),
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, call, "Call marked as missed"));
});

/* ==========================================================
   6️⃣ GET CALL HISTORY
========================================================== */
export const getCallHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const calls = await Call.aggregate([
    {
      $match: {
        $or: [{ callerId: userId }, { calleeIds: userId }]
      }
    },
    { $sort: { startedAt: -1 } },
    { $skip: Number(skip) },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: "chats",
        localField: "chatId",
        foreignField: "_id",
        as: "chat"
      }
    },
    { $unwind: "$chat" },
    {
      $project: {
        _id: 1,
        chatId: 1,
        type: 1,
        status: 1,
        startedAt: 1,
        endedAt: 1,
        duration: 1,
        "chat.name": 1,
        "chat.isGroup": 1,
        callerId: 1,
        calleeIds: 1
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, calls, "Call history fetched"));
});

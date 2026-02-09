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
import { clearCallTimeout, createCall, startCallTimeout } from "../services/call.service.js";
import Profile from "../models/profile.model.js";
import { isChatBlockedForUser, isUserBlockedBetween } from "../utils/block.utils.js";

/* ===========================================================
   Helper - emit to participants' user rooms + chat room (best of both)
   Ensures recipients get events whether they are viewing chat or not.
   =========================================================== */
function emitToParticipants(io, participantIds = [], chatId, event, payload) {
  // emit to each user's personal room
  participantIds.forEach((uid) => {
    try {
      io.in(`user:${String(uid)}`).emit(event, payload);
    } catch (e) { /* ignore */ }
  });

  // also emit to the chat room for convenience (so chat listeners also see it)
  try {
    io.in(`chat:${String(chatId)}`).emit(event, payload);
  } catch (e) { /* ignore */ }
}

/* ===========================================================
   START CALL (uses CallService)
   POST /api/calls
   body: { chatId, type, metadata? }
   =========================================================== */

export const startCall = asyncHandler(async (req, res) => {
  const { chatId, type, metadata = {} } = req.body;

  if (!chatId || !type) throw new ApiError(400, "chatId and type required");
  if (!["audio", "video"].includes(type)) throw new ApiError(400, "Invalid call type");

  const chat = await Chat.findById(chatId).lean();
  if (!chat) throw new ApiError(404, "Chat not found");

  // 🚫 Blocked chat
  const chatBlocked = await isChatBlockedForUser(chatId, req.user._id);
  if (chatBlocked) {
    throw new ApiError(403, "Chat is blocked");
  }

  if (!chat.isGroup) {
    const members = await ChatMember.find({ chatId }).lean();
    const other = members.find(m => String(m.userId) !== String(req.user._id));

    if (other) {
      const blocked = await isUserBlockedBetween(req.user._id, other.userId);
      if (blocked) {
        throw new ApiError(403, "User is blocked");
      }
    }
  }

  const callerProfile = await Profile.findOne({ userId: req.user._id }).lean();

  // 🔥 Enriched metadata sent to receivers
  const enrichedMeta = {
    ...metadata, // allow extra client metadata
    callerName: callerProfile?.username,
    callerAvatar: callerProfile?.avatarUrl,
    ...(chat.isGroup && {
      groupName: chat.name,
      groupAvatar: chat.groupAvatarUrl,
    }),
  };

  const call = await createCall({
    callerId: req.user._id,
    chatId,
    type,
    metadata: enrichedMeta, // store enriched version
  });

  startCallTimeout(call);

  const io = req.app.get("io");

  // send ringing notification to each callee (user rooms) and chat
  emitToParticipants(io, call.calleeIds, chatId, ChatEventEnum.CALL_RINGING_EVENT, {
    callId: call._id.toString(),
    chatId: String(chatId),
    type,
    callerId: String(req.user._id),
    metadata: enrichedMeta,
    timestamp: new Date(),
  });

  // also notify caller's user room so caller's own client can show an outgoing "calling" UI (optional)
  emitToParticipants(io, [req.user._id], chatId, ChatEventEnum.CALL_RINGING_EVENT, {
    callId: call._id.toString(),
    chatId: String(chatId),
    type,
    callerId: String(req.user._id),
    metadata: enrichedMeta,
    timestamp: new Date(),
  });

  return res.status(201).json(new ApiResponse(201, call, "Call initiated"));
});

/* ===========================================================
   ACCEPT CALL
   POST /api/calls/:callId/accept
   =========================================================== */
export const acceptCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  const blockedChat = await isChatBlockedForUser(call.chatId, req.user._id);
  if (blockedChat) {
    throw new ApiError(403, "Chat is blocked");
  }

  const participants = [String(call.callerId), ...((call.calleeIds || []).map(String))];
  if (!participants.includes(String(req.user._id)))
    throw new ApiError(403, "Not a participant");

  if (call.status !== "ringing") throw new ApiError(400, "Call already handled");

  call.status = "accepted";
  call.startedAt = call.startedAt || new Date();
  await call.save();
  clearCallTimeout(String(call._id));

  const io = req.app.get("io");

  emitToParticipants(io, participants, call.chatId, ChatEventEnum.CALL_ACCEPTED_EVENT, {
    callId: call._id.toString(),
    userId: req.user._id.toString(),
    timestamp: new Date(),
  });

  return res.status(200).json(new ApiResponse(200, call, "Call accepted"));
});

/* ===========================================================
   REJECT CALL
   POST /api/calls/:callId/reject
   =========================================================== */
export const rejectCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  const blockedChat = await isChatBlockedForUser(call.chatId, req.user._id);
  if (blockedChat) {
    throw new ApiError(403, "Chat is blocked");
  }

  const participants = [String(call.callerId), ...((call.calleeIds || []).map(String))];
  if (!participants.includes(String(req.user._id)))
    throw new ApiError(403, "Not a participant");

  call.status = "rejected";
  call.endedAt = new Date();
  await call.save();
  clearCallTimeout(String(call._id));

  const io = req.app.get("io");

  emitToParticipants(io, participants, call.chatId, ChatEventEnum.CALL_REJECTED_EVENT, {
    callId: call._id.toString(),
    userId: req.user._id.toString(),
    timestamp: new Date(),
  });

  return res.status(200).json(new ApiResponse(200, call, "Call rejected"));
});

/* ===========================================================
   END CALL
   POST /api/calls/:callId/end
   =========================================================== */
export const endCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  const blockedChat = await isChatBlockedForUser(call.chatId, req.user._id);
  if (blockedChat) {
    throw new ApiError(403, "Chat is blocked");
  }

  const participants = [String(call.callerId), ...((call.calleeIds || []).map(String))];
  if (!participants.includes(String(req.user._id)))
    throw new ApiError(403, "Not a participant");

  call.status = "ended";
  call.endedAt = new Date();
  call.duration = call.startedAt
    ? Math.floor((call.endedAt - call.startedAt) / 1000)
    : 0;

  await call.save();
  clearCallTimeout(String(call._id));

  const io = req.app.get("io");

  emitToParticipants(io, participants, call.chatId, ChatEventEnum.CALL_ENDED_EVENT, {
    callId: call._id.toString(),
    duration: call.duration,
    endedBy: req.user._id.toString(),
    timestamp: new Date(),
  });

  return res.status(200).json(new ApiResponse(200, call, "Call ended"));
});

/* ===========================================================
   MARK MISSED
   POST /api/calls/:callId/missed
   =========================================================== */
export const markMissedCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  if (!callId) throw new ApiError(400, "callId required");

  const call = await Call.findById(callId);
  if (!call) throw new ApiError(404, "Call not found");

  call.status = "missed";
  call.endedAt = new Date();
  await call.save();

  const io = req.app.get("io");
  emitToParticipants(io, [call.callerId], call.chatId, ChatEventEnum.CALL_MISSED_EVENT, {
    callId: call._id.toString(),
    userId: req.user._id.toString(),
    timestamp: new Date(),
  });

  return res.status(200).json(new ApiResponse(200, call, "Call marked as missed"));
});

/* ===========================================================
   GET CALL HISTORY
   GET /api/calls/history?page=1&limit=20
   =========================================================== */
export const getCallHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, from, to, q } = req.query;
  const skip = (page - 1) * limit;
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const match = {
    $or: [{ callerId: userId }, { calleeIds: userId }],
  };

  if (type && ["audio", "video"].includes(type)) {
    match.type = type;
  }

  if (from || to) {
    match.startedAt = {};
    if (from) match.startedAt.$gte = new Date(from);
    if (to) match.startedAt.$lte = new Date(to);
  }

  // optional: q search in chat name
  const pipeline = [
    { $match: match },
    { $sort: { startedAt: -1 } },
    { $skip: Number(skip) },
    { $limit: Number(limit) },
    {
      $lookup: { from: "chats", localField: "chatId", foreignField: "_id", as: "chat" }
    },
    { $unwind: "$chat" },
  ];

  if (q) {
    // Apply text filter (simple): check chat.name or participant ids
    // We can't insert a $match on chat.name after $lookup easily here; instead do small client-side filter after we fetch.
    // For full-text search, add proper indexes and implement $match on chat.name
  }

  const calls = await Call.aggregate(pipeline);

  return res.status(200).json(new ApiResponse(200, calls, "Call history fetched"));
});


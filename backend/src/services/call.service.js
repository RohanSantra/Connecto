import Call from "../models/call.model.js";
import Chat from "../models/chat.model.js";
import ChatMember from "../models/chatMember.model.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";
import {
  isUserBlockedBetween,
  isChatBlockedForUser,
  isUserMemberOfChat,
} from "../utils/block.utils.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";

/* =========================================================
   RATE LIMIT
========================================================= */
const RATE_LIMIT_WINDOW_SEC = Number(process.env.CALL_RATE_LIMIT_WINDOW_SEC || 8);
const callerLastCall = new Map();

/* =========================================================
   ⏳ AUTO MISSED CALL TIMER SYSTEM
========================================================= */
const CALL_TIMEOUT_MS = 30_000;
const activeCallTimers = new Map(); // callId -> timeoutRef

export function startCallTimeout(call) {
  const callId = call._id.toString();
  if (activeCallTimers.has(callId)) return;

  const timeout = setTimeout(async () => {
    try {
      const c = await Call.findById(callId);
      if (!c || c.status !== "ringing") return;

      c.status = "missed";
      c.endedAt = new Date();
      await c.save();

      // 🔔 notify ALL participants (caller + callees)
      const participants = [
        c.callerId.toString(),
        ...(c.calleeIds || []).map(id => id.toString()),
      ];

      participants.forEach((uid) => {
        emitSocketEvent(
          global.io,
          "user",
          uid,
          ChatEventEnum.CALL_MISSED_EVENT,
          {
            callId,
            chatId: c.chatId.toString(),
            timestamp: new Date(),
          }
        );
      });
      
    } catch (err) {
      console.error("Call timeout error:", err);
    } finally {
      activeCallTimers.delete(callId);
    }
  }, CALL_TIMEOUT_MS);

  activeCallTimers.set(callId, timeout);
}

export function clearCallTimeout(callId) {
  const t = activeCallTimers.get(callId);
  if (t) {
    clearTimeout(t);
    activeCallTimers.delete(callId);
  }
}

/* =========================================================
   CREATE CALL
========================================================= */
export async function createCall({ callerId, chatId, type, metadata }) {
  // membership
  const isMember = await isUserMemberOfChat(callerId, chatId);
  if (!isMember) throw new ApiError(403, "Not a member of this chat");

  const chat = await Chat.findById(chatId).lean();
  if (!chat) throw new ApiError(404, "Chat not found");

  // block rules
  if (!chat.isGroup) {
    const members = await ChatMember.find({ chatId }).select("userId").lean();
    const other = members.map(m => String(m.userId)).find(id => id !== String(callerId));
    if (!other) throw new ApiError(400, "Invalid direct chat");

    const pairBlocked = await isUserBlockedBetween(callerId, other);
    if (pairBlocked) throw new ApiError(403, "Cannot call this user (blocked)");
  } else {
    const chatBlockedByCaller = await isChatBlockedForUser(chatId, callerId);
    if (chatBlockedByCaller) throw new ApiError(403, "You have blocked this group");
  }

  // rate limit
  const last = callerLastCall.get(String(callerId));
  const now = Date.now();
  if (last && (now - last) / 1000 < RATE_LIMIT_WINDOW_SEC) {
    throw new ApiError(
      429,
      `You are calling too frequently. Wait ${RATE_LIMIT_WINDOW_SEC} seconds between actions.`
    );
  }
  callerLastCall.set(String(callerId), now);

  // callee list
  const memberDocs = await ChatMember.find({ chatId }).select("userId").lean();
  const calleeIds = memberDocs.map(m => m.userId).filter(id => String(id) !== String(callerId));
  if (!calleeIds.length) throw new ApiError(400, "No participants to call");

  // create call
  const call = await Call.create({
    chatId,
    callerId,
    calleeIds,
    type,
    status: "ringing",
    startedAt: new Date(),
    metadata: metadata || {},
  });

  // start auto-missed timer
  startCallTimeout(call);

  return call;
}

/* =========================================================
   HELPER — GET ACTIVE CALL
========================================================= */
export async function getActiveCallForChat(chatId) {
  return Call.findOne({
    chatId,
    status: { $in: ["ringing", "accepted"] },
  })
    .sort({ startedAt: -1 })
    .lean();
}

// src/lib/socket.js
import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Device from "../models/device.model.js";
import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import ChatMember from "../models/chatMember.model.js";
import { ChatEventEnum } from "../constants.js";
import Block from "../models/block.model.js";
import { loadBlockedSetsForUser, isUserBlockedBetween, isChatBlockedForUser, isUserMemberOfChat } from "../utils/block.utils.js";

import mongoose from "mongoose";
import Call from "../models/call.model.js";

/* -------------------------
   Room helpers
------------------------- */
export const userRoom = (id) => `user:${id}`;
export const chatRoom = (id) => `chat:${id}`;

/* -------------------------
   Helper: try authenticate via token in handshake or cookies.
   Returns user doc or null. DOES NOT disconnect — caller decides.
------------------------- */
async function tryAuthenticateSocket(socket) {
  try {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
    const token = socket.handshake.auth?.token || cookies?.accessToken;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded.userId;
    const user = await User.findById(userId).lean();
    if (!user) return null;

    socket.user = user;
    socket.deviceId =
      socket.handshake.auth?.deviceId ||
      socket.handshake.query?.deviceId ||
      null;

    // Load block sets for this user into socket.data for fast checks
    try {
      const sets = await loadBlockedSetsForUser(user._id);
      socket.data = socket.data || {};
      socket.data.blockedUsersSet = sets.blockedUsersSet;
      socket.data.usersWhoBlockedMeSet = sets.usersWhoBlockedMeSet;
      socket.data.blockedChatsSet = sets.blockedChatsSet;
    } catch (err) {
      // swallow; not critical
      socket.data = socket.data || {};
      socket.data.blockedUsersSet = new Set();
      socket.data.usersWhoBlockedMeSet = new Set();
      socket.data.blockedChatsSet = new Set();
    }

    return user;
  } catch (err) {
    // do not throw here — let caller decide how to handle
    return null;
  }
}

/* -------------------------
   Online users mapping:
     userId -> Set(socketId)
   Allows multiple sockets per user (multi-device).
------------------------- */
const onlineUsers = new Map(); // Map<userId, Set<socketId>>

// Grace disconnect timers (prevents flicker on Render / network jitter)
const pendingOfflineTimers = new Map(); // Map<userId, Timeout>

// How long to wait before marking user offline (ms)
const OFFLINE_GRACE_PERIOD = 7000; // 7 seconds (recommended 5–10s)


/* -------------------------
   Utility to add/remove socketId for a user
------------------------- */
function addOnlineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}
function removeOnlineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) return;
  const set = onlineUsers.get(userId);
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

/* -------------------------
   Device + profile online management
------------------------- */
async function markDeviceOnline(io, userId, deviceId, socketId) {

  /* -----------------------------------------
     CANCEL ANY PENDING OFFLINE TIMER
  ----------------------------------------- */
  if (pendingOfflineTimers.has(userId)) {
    clearTimeout(pendingOfflineTimers.get(userId));
    pendingOfflineTimers.delete(userId);
  }

  /* -----------------------------------------
     UPDATE DEVICE STATUS
  ----------------------------------------- */
  if (deviceId) {
    await Device.findOneAndUpdate(
      { userId, deviceId },
      {
        $set: { userId, deviceId, status: "active", lastSeen: new Date() },
      },
      { upsert: true }
    );
  }

  const wasOnline = onlineUsers.has(userId);
  addOnlineSocket(userId, socketId);

  /* -----------------------------------------
     IF FIRST SOCKET → MARK ONLINE
  ----------------------------------------- */
  if (!wasOnline) {
    await Profile.updateOne(
      { userId },
      { $set: { isOnline: true, lastSeen: null } }
    );

    io.emit(ChatEventEnum.USER_STATUS_UPDATED, {
      userId,
      isOnline: true,
      lastSeen: null,
    });

    io.in(userRoom(userId)).emit(ChatEventEnum.USER_ONLINE_EVENT, {
      userId,
      deviceId,
      socketId,
      timestamp: new Date(),
    });

    /* ======================================================
       KEEP YOUR FULL MESSAGE DELIVERY LOGIC BELOW
       (DO NOT REMOVE ANYTHING)
    ====================================================== */

    try {
      const membership = await ChatMember.find({ userId }).select("chatId").lean();
      const chatIds = membership.map((m) => m.chatId).filter(Boolean);

      if (chatIds.length > 0) {
        const objectUserId = new mongoose.Types.ObjectId(userId);

        const undelivered = await Message.find({
          chatId: { $in: chatIds },
          senderId: { $ne: objectUserId },
          "deliveredTo.userId": { $ne: objectUserId },
          deleted: false,
        })
          .sort({ createdAt: 1 })
          .limit(500)
          .select("_id chatId senderId createdAt")
          .lean();

        if (undelivered.length > 0) {

          const blocks = await Block.find({
            $or: [
              { blockedBy: objectUserId },
              { blockedUser: objectUserId, type: "user" }
            ],
          }).lean();

          const blockedUsersSet = new Set();
          const usersWhoBlockedMeSet = new Set();
          const blockedChatsSet = new Set();

          for (const b of blocks) {
            if (b.type === "user") {
              if (String(b.blockedBy) === String(objectUserId) && b.blockedUser)
                blockedUsersSet.add(String(b.blockedUser));
              if (String(b.blockedUser) === String(objectUserId) && b.blockedBy)
                usersWhoBlockedMeSet.add(String(b.blockedBy));
            } else if (b.type === "chat") {
              if (String(b.blockedBy) === String(objectUserId) && b.blockedChat)
                blockedChatsSet.add(String(b.blockedChat));
            }
          }

          const filtered = undelivered.filter((m) => {
            if (blockedChatsSet.has(String(m.chatId))) return false;
            const senderIdStr = String(m.senderId);
            if (blockedUsersSet.has(senderIdStr)) return false;
            if (usersWhoBlockedMeSet.has(senderIdStr)) return false;
            return true;
          });

          const deliveredAt = new Date();
          const msgIds = filtered.map((m) => m._id);

          await Message.updateMany(
            { _id: { $in: msgIds }, "deliveredTo.userId": { $ne: objectUserId } },
            { $push: { deliveredTo: { userId: objectUserId, deliveredAt } } }
          );

          for (const msg of filtered) {
            const payload = {
              messageId: msg._id,
              chatId: msg.chatId,
              userId,
              deliveredAt,
            };

            io.in(chatRoom(String(msg.chatId))).emit(
              ChatEventEnum.MESSAGE_DELIVERED_EVENT,
              payload
            );

            io.in(userRoom(String(msg.senderId))).emit(
              ChatEventEnum.MESSAGE_DELIVERED_EVENT,
              payload
            );

            io.in(userRoom(String(userId))).emit(
              ChatEventEnum.MESSAGE_DELIVERED_EVENT,
              payload
            );
          }
        }
      }
    } catch (err) {
      console.warn("markDeviceOnline deliver failed:", err);
    }

  } else {
    io.in(userRoom(userId)).emit(ChatEventEnum.DEVICE_REGISTERED_EVENT, {
      userId,
      deviceId,
      socketId,
      timestamp: new Date(),
    });
  }
}

async function markDeviceOffline(io, userId, deviceId, socketId) {

  if (deviceId) {
    await Device.updateOne(
      { userId, deviceId },
      { $set: { lastSeen: new Date() } }
    );
  }

  removeOnlineSocket(userId, socketId);

  /* -----------------------------------------
     IF OTHER SOCKETS STILL ACTIVE
  ----------------------------------------- */
  if (onlineUsers.has(userId)) {
    io.in(userRoom(userId)).emit(ChatEventEnum.DEVICE_DISCONNECTED_EVENT, {
      userId,
      deviceId,
      socketId,
      timestamp: new Date(),
    });
    return;
  }

  /* -----------------------------------------
     START GRACE TIMER (PREVENT FLICKER)
  ----------------------------------------- */

  if (pendingOfflineTimers.has(userId)) return;

  const timeout = setTimeout(async () => {

    try {

      if (onlineUsers.has(userId)) {
        pendingOfflineTimers.delete(userId);
        return;
      }

      const lastSeen = new Date();

      await Profile.updateOne(
        { userId },
        { $set: { isOnline: false, lastSeen } }
      );

      io.emit(ChatEventEnum.USER_STATUS_UPDATED, {
        userId,
        isOnline: false,
        lastSeen,
      });

      io.in(userRoom(userId)).emit(ChatEventEnum.USER_OFFLINE_EVENT, {
        userId,
        deviceId,
        lastSeen,
      });

    } catch (err) {
      console.warn("Offline timer error:", err);
    }

    pendingOfflineTimers.delete(userId);

  }, OFFLINE_GRACE_PERIOD);

  pendingOfflineTimers.set(userId, timeout);
}



/* -------------------------
   Forwarding helpers for socket events
------------------------- */
const forwardToChat = (io, socket, event) =>
  socket.on(event, (payload = {}) => {
    if (!payload?.chatId) return;
    io.in(chatRoom(payload.chatId)).emit(event, payload);
  });

const forwardToUser = (io, socket, event) =>
  socket.on(event, (payload = {}) => {
    if (!payload?.userId) return;
    io.in(userRoom(payload.userId)).emit(event, payload);
  });

const broadcastGlobal = (io, socket, event) =>
  socket.on(event, (payload = {}) => {
    io.emit(event, payload);
  });

/* -------------------------
   Mount event groups
------------------------- */
function mountMessageEvents(socket, io) {
  // forwardToChat(io, socket, ChatEventEnum.MESSAGE_RECEIVED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.MESSAGE_EDIT_EVENT);
  forwardToChat(io, socket, ChatEventEnum.MESSAGE_DELETE_EVENT);
  forwardToChat(io, socket, ChatEventEnum.CHAT_CLEARED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.MESSAGE_PIN_EVENT);
  forwardToChat(io, socket, ChatEventEnum.MESSAGE_UNPIN_EVENT);
  // forwardToChat(io, socket, ChatEventEnum.MESSAGE_DELIVERED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.MESSAGE_READ_EVENT);

  // reactions (these often include messageId and chatId)
  forwardToChat(io, socket, ChatEventEnum.MESSAGE_REACTION_ADDED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.MESSAGE_REACTION_REMOVED_EVENT);
}

function mountSendMessageEvent(socket, io) {
  socket.on(ChatEventEnum.MESSAGE_SEND_EVENT, async (payload = {}, ack) => {
    try {
      const user = socket.user;
      if (!user || !user._id) {
        return ack?.({ error: "not_authenticated" });
      }

      const senderId = String(user._id);
      const {
        chatId,
        clientTempId = null,
        ciphertext,
        ciphertextNonce,
        type = "text",
        attachments = [],
        encryptedKeys = [],
        senderDeviceId = socket.deviceId || null,
      } = payload;

      if (!chatId) return ack?.({ error: "chatId required" });

      // fetch chat and members
      const chat = await Chat.findById(chatId).lean();
      if (!chat) return ack?.({ error: "invalid_chat" });

      const memberDocs = await ChatMember.find({ chatId }).select("userId role").lean();
      const memberIds = memberDocs.map(m => String(m.userId));
      if (!memberIds.includes(senderId)) return ack?.({ error: "not_a_member" });

      // 1) Direct chat: block if user pair blocked (either direction)
      if (!chat.isGroup) {
        // find the other participant
        const other = memberIds.find(id => id !== senderId);
        if (!other) return ack?.({ error: "invalid_direct_chat" });

        const blocked = await isUserBlockedBetween(senderId, other);
        if (blocked) {
          return ack?.({ error: "blocked_pair" });
        }
      } else {
        // 2) Group chat: block if sender blocked this group
        const senderBlockedChat = await isChatBlockedForUser(chatId, senderId);
        if (senderBlockedChat) return ack?.({ error: "you_blocked_chat" });
      }

      // Create message (we won't attempt to push deliveredTo for everyone now)
      const message = await Message.create({
        chatId,
        senderId,
        senderDeviceId: senderDeviceId || socket.deviceId || null,
        ciphertext,
        ciphertextNonce,
        type,
        attachments,
        encryptedKeys,
        clientTempId,
      });

      // Prepare payload to deliver (lean shape)
      const out = {
        _id: message._id,
        chatId: String(message.chatId),
        senderId: String(message.senderId),
        ciphertext: message.ciphertext,
        ciphertextNonce: message.ciphertextNonce,
        type: message.type,
        attachments: message.attachments || [],
        createdAt: message.createdAt,
        clientTempId,
        senderDeviceId: message.senderDeviceId,
      };

      // Determine recipients:
      // For groups: deliver to each member individually unless:
      //  - that member blocked this chat (they won't see it)
      //  - that member blocked the sender (they won't see it)
      // For direct: deliver to the other user only if pair not blocked (we already checked)
      const recipients = [];

      for (const m of memberDocs) {
        const rid = String(m.userId);
        if (rid === senderId) continue;

        // if recipient blocked this chat? check Block.exists per-recipient
        const recipientBlockedChat = await Block.exists({
          type: "chat",
          blockedBy: mongoose.Types.ObjectId(rid),
          blockedChat: mongoose.Types.ObjectId(chatId),
        });
        if (recipientBlockedChat) continue;

        // if recipient blocked sender OR sender blocked recipient => skip (mutual semantics)
        const pairBlocked = await Block.exists({
          type: "user",
          $or: [
            { blockedBy: mongoose.Types.ObjectId(rid), blockedUser: mongoose.Types.ObjectId(senderId) },
            { blockedBy: mongoose.Types.ObjectId(senderId), blockedUser: mongoose.Types.ObjectId(rid) },
          ],
        });
        if (pairBlocked) continue;

        recipients.push(rid);
      }

      // Emit message to each recipient's user room individually (so we can skip excluded users)
      for (const rid of recipients) {
        io.in(userRoom(rid)).emit(ChatEventEnum.MESSAGE_RECEIVED_EVENT, out);
      }

      // Also emit to sender's own user room so sender UI sees the message created
      io.in(userRoom(senderId)).emit(ChatEventEnum.MESSAGE_RECEIVED_EVENT, out);

      // Persist deliveredTo for recipients who are currently online and received it
      // We'll check onlineUsers map for presence
      const onlineRecipientIds = recipients.filter((rid) => onlineUsers.has(rid));
      if (onlineRecipientIds.length) {
        await Message.updateOne(
          { _id: message._id },
          { $push: { deliveredTo: { $each: onlineRecipientIds.map(id => ({ userId: mongoose.Types.ObjectId(id), deliveredAt: new Date() })) } } }
        );
      }

      // Acknowledge success with created message id
      ack?.({ ok: true, messageId: message._id });
    } catch (err) {
      console.warn("send-message failed:", err && err.stack ? err.stack : err);
      ack?.({ error: "send_failed", detail: err.message });
    }
  });
}

function mountCallEventsWithChecks(socket, io) {
  // Generic forward with quick permission check
  socket.on("call:signal", async (payload = {}) => {
    try {
      const user = socket.user;
      if (!user || !user._id) return socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "not_authenticated" });

      const { callId, chatId, toUserId, data } = payload;
      if (!chatId || !callId || !toUserId || !data) return;

      // membership check
      const isMember = await isUserMemberOfChat(user._id, chatId);
      if (!isMember) return socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "not_a_member" });

      // check if recipient is member
      const recipientIsMember = await isUserMemberOfChat(toUserId, chatId);
      if (!recipientIsMember) return socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "recipient_not_member" });

      // check pair-blocks (direct) or chat-blocks (group)
      const chat = await Chat.findById(chatId).lean();
      if (!chat) return socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "invalid_chat" });

      if (!chat.isGroup) {
        // ensure neither side blocked the other
        const blocked = await isUserBlockedBetween(String(user._id), String(toUserId));
        if (blocked) return socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "blocked_pair" });
      } else {
        // if recipient blocked this chat or sender blocked chat -> don't forward
        const recipientBlockedChat = await isChatBlockedForUser(chatId, toUserId);
        const senderBlockedChat = await isChatBlockedForUser(chatId, user._id);
        if (recipientBlockedChat || senderBlockedChat) return socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "chat_blocked" });
      }

      // pass through: emit to recipient's user room (so all their devices receive signaling)
      io.in(`user:${toUserId}`).emit("call:signal", {
        callId,
        chatId,
        fromUserId: String(user._id),
        data,
        timestamp: new Date(),
      });
    } catch (err) {
      console.warn("call:signal failed:", err);
      socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "call_signal_failed", detail: String(err?.message || err) });
    }
  });
}

/*
function mountGroupEvents(socket, io) {
  forwardToChat(io, socket, ChatEventEnum.UPDATE_GROUP_NAME_EVENT);
  forwardToChat(io, socket, ChatEventEnum.UPDATE_GROUP_AVATAR_EVENT);
  forwardToChat(io, socket, ChatEventEnum.GROUP_MEMBER_ADDED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.GROUP_MEMBER_REMOVED_EVENT);
}
*/

function mountProfileEvents(socket, io) {
  // profile events can be broadcast globally or to userRoom depending on payload
  socket.on(ChatEventEnum.USER_PROFILE_UPDATED, (payload) => {
    // if payload has userId - broadcast to everyone (so contacts update)
    io.emit(ChatEventEnum.USER_PROFILE_UPDATED, payload);
  });
  socket.on(ChatEventEnum.USER_AVATAR_UPDATED, (payload) => {
    io.emit(ChatEventEnum.USER_AVATAR_UPDATED, payload);
  });
  socket.on(ChatEventEnum.USER_STATUS_UPDATED, (payload) => {
    io.emit(ChatEventEnum.USER_STATUS_UPDATED, payload);
  });
}

function mountTypingEvents(socket, io) {
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
    if (!chatId) return;
    socket.join(chatRoom(chatId));
  });

  socket.on(ChatEventEnum.LEAVE_CHAT_EVENT, (chatId) => {
    if (!chatId) return;
    socket.leave(chatRoom(chatId));
  });

  socket.on(ChatEventEnum.TYPING_EVENT, ({ chatId, userId }) => {
    socket.to(chatRoom(chatId)).emit(ChatEventEnum.TYPING_EVENT, {
      chatId,
      userId,
      timestamp: new Date(),
    });
  });

  socket.on(ChatEventEnum.STOP_TYPING_EVENT, ({ chatId, userId }) => {
    socket.to(chatRoom(chatId)).emit(ChatEventEnum.STOP_TYPING_EVENT, {
      chatId,
      userId,
      timestamp: new Date(),
    });
  });
}

// function mountCallEvent(socket, io) {
//   forwardToChat(io, socket, ChatEventEnum.CALL_RINGING_EVENT);
//   forwardToChat(io, socket, ChatEventEnum.CALL_ACCEPTED_EVENT);
//   forwardToChat(io, socket, ChatEventEnum.CALL_REJECTED_EVENT);
//   forwardToChat(io, socket, ChatEventEnum.CALL_ENDED_EVENT);
//   forwardToChat(io, socket, ChatEventEnum.CALL_MISSED_EVENT);
// }

/* -------------------------
   Main initializer (exported)
------------------------- */
export function initializeSocket(server, app) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    },
    pingTimeout: 60000,
  });

  Profile.updateMany({}, {
    $set: { isOnline: false, lastSeen: new Date() }
  }).catch(err => console.error("Failed to reset online statuses:", err));

  // attach io to app so controllers can access it via req.app.get('io')
  app.set("io", io);

  global.io = io;

  // also attach maps for external access
  io.socketUserMap = onlineUsers;

  io.on("connection", async (socket) => {
    // try auth from token/cookie first
    const user = await tryAuthenticateSocket(socket);

    // If authenticated, do immediate join. If not, wait for 'user_connected' event
    if (user) {
      const userId = user._id.toString();
      socket.join(userRoom(userId));
      await markDeviceOnline(io, userId, socket.deviceId, socket.id);
      socket.emit(ChatEventEnum.CONNECTED_EVENT, { userId, deviceId: socket.deviceId, socketId: socket.id });
    }

    // allow clients to send a simple "user_connected" with userId (fallback)
    socket.on("user_connected", async ({ userId, deviceId } = {}) => {
      try {
        if (!userId) return;
        socket.user = { _id: userId };
        socket.deviceId = deviceId || socket.deviceId || null;
        socket.join(userRoom(userId));
        await markDeviceOnline(io, userId, socket.deviceId, socket.id);
        socket.emit(ChatEventEnum.CONNECTED_EVENT, { userId, deviceId: socket.deviceId, socketId: socket.id });
      } catch (err) {
        socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, { message: "user_connected failed", detail: err.message });
      }
    });

    // mount features
    mountTypingEvents(socket, io);
    mountMessageEvents(socket, io);
    mountSendMessageEvent(socket, io);
    // mountGroupEvents(socket, io);
    mountProfileEvents(socket, io);
    mountCallEventsWithChecks(socket, io);

    /* ----------------------------
       Useful: get user status
       Client: socket.emit('get_user_status', requestedUserId, (resp)=>{...})
    ---------------------------- */
    socket.on("get_user_status", async (requestedUserId, callback) => {
      try {
        const isOnline = onlineUsers.has(requestedUserId);
        let lastSeen = null;
        if (!isOnline) {
          const profile = await Profile.findOne({ userId: requestedUserId }).lean();
          lastSeen = profile?.lastSeen || null;
        } else {
          lastSeen = null;
        }
        callback?.({
          userId: requestedUserId,
          isOnline,
          lastSeen,
        });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on(ChatEventEnum.MESSAGE_DELIVERED_EVENT, async (payload = {}) => {
      try {
        const { messageId, chatId, userId } = payload;
        if (!messageId || !chatId || !userId) return;

        // ignore self-delivery attempts
        const msgObj = await Message.findById(messageId).select("senderId").lean();
        if (msgObj && String(msgObj.senderId) === String(userId)) return;

        const uidObj = new mongoose.Types.ObjectId(userId);
        const deliveredAt = payload.deliveredAt
          ? new Date(payload.deliveredAt)
          : new Date();

        // persist once only
        await Message.updateOne(
          { _id: messageId, "deliveredTo.userId": { $ne: uidObj } },
          { $push: { deliveredTo: { userId: uidObj, deliveredAt } } }
        );

        const out = { messageId, chatId, userId, deliveredAt };

        // notify chat members
        socket.to(chatRoom(String(chatId))).emit(
          ChatEventEnum.MESSAGE_DELIVERED_EVENT,
          out
        );

        // notify sender
        const msg = await Message.findById(messageId).select("senderId").lean();
        if (msg?.senderId) {
          socket.to(userRoom(String(msg.senderId))).emit(
            ChatEventEnum.MESSAGE_DELIVERED_EVENT,
            out
          );
        }
      } catch (err) {
        console.warn("deliver-event persist failed:", err);
      }
    });

    socket.on("BLOCK_LIST_REFRESH", async () => {
      const sets = await loadBlockedSetsForUser(socket.user._id);
      socket.data.blockedUsersSet = sets.blockedUsersSet;
      socket.data.usersWhoBlockedMeSet = sets.usersWhoBlockedMeSet;
      socket.data.blockedChatsSet = sets.blockedChatsSet;
    });

    socket.on("call:rejoin", async ({ callId }) => {
      try {
        if (!callId) return;

        const call = await Call.findById(callId);
        if (!call) return;

        // call must be in accepted state to rejoin
        if (String(call.status) !== "accepted") return;

        // make sure socket is authenticated & member
        const userObj = socket.user;
        if (!userObj || !userObj._id) return;

        const userId = String(userObj._id);

        const participants = [
          String(call.callerId),
          ...(call.calleeIds || []).map((x) => String(x)),
        ];

        if (!participants.includes(userId)) return;

        // notify participants that this user has (re)joined
        io.in(userRoom(userId)).emit(ChatEventEnum.CALL_ACCEPTED_EVENT, {
          callId: call._id.toString(),
          userId,
          timestamp: new Date(),
        });

        // also broadcast to other participants' user rooms and chat room
        // (so UI + any connected devices get the event)
        participants.forEach((uid) => {
          if (uid === userId) return;
          io.in(userRoom(uid)).emit(ChatEventEnum.CALL_ACCEPTED_EVENT, {
            callId: call._id.toString(),
            userId,
            timestamp: new Date(),
          });
        });

        // also emit to the chat room
        io.in(chatRoom(String(call.chatId))).emit(ChatEventEnum.CALL_ACCEPTED_EVENT, {
          callId: call._id.toString(),
          userId,
          timestamp: new Date(),
        });
      } catch (err) {
        console.warn("call:rejoin handler failed:", err && err.stack ? err.stack : err);
      }
    });




    /* ----------------------------
       Clean disconnect
    ---------------------------- */
    socket.on("disconnect", async (reason) => {
      try {
        const userId = socket.user?._id?.toString();
        const deviceId = socket.deviceId || null;
        if (userId) {
          await markDeviceOffline(io, userId, deviceId, socket.id);
        }
      } catch (err) {
        // ignore
      }
    });
  });

  return io;
}

/* -------------------------
   Universal emitter for controllers to call.
   - reqOrIo can be (req) where req.app.get('io') exists, or the io instance.
   - roomType: 'user' | 'chat' | 'global'
   - id: userId or chatId (not required for global)
------------------------- */
export function emitSocketEvent(reqOrIo, roomType, id, event, payload) {
  const io = reqOrIo?.app?.get ? reqOrIo.app.get("io") : reqOrIo;
  if (!io) return;

  if (roomType === "global" || !roomType) {
    io.emit(event, payload);
  } else if (roomType === "user") {
    io.in(userRoom(id)).emit(event, payload);
  } else if (roomType === "chat") {
    io.in(chatRoom(id)).emit(event, payload);
  } else {
    // allow passing pre-built room string
    io.in(roomType).emit(event, payload);
  } 
}

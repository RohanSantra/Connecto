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
import mongoose from "mongoose";

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

  if (!wasOnline) {
    await Profile.updateOne(
      { userId },
      { $set: { isOnline: true, lastSeen: null } }
    );

    // broadcast status once
    io.emit(ChatEventEnum.USER_STATUS_UPDATED, {
      userId,
      isOnline: true,
      lastSeen: null,
    });

    // notify user's own devices too (optional)
    io.in(userRoom(userId)).emit(ChatEventEnum.USER_ONLINE_EVENT, {
      userId,
      deviceId,
      socketId,
      timestamp: new Date(),
    });

    /* ======================================================
       DELIVER any pending messages for this user
       - find chats the user is member of
       - find messages where deliveredTo does NOT include this user
       - emit MESSAGE_DELIVERED_EVENT to each chat room
       - persist deliveredTo using $addToSet
    ====================================================== */
    try {
      const membership = await ChatMember.find({ userId }).select("chatId").lean();
      const chatIds = membership.map((m) => m.chatId).filter(Boolean);

      if (chatIds.length > 0) {
        const objectUserId = new mongoose.Types.ObjectId(userId);

        // find undelivered messages (sender != user AND deliveredTo doesn't contain user)
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
          const deliveredAt = new Date();
          const msgIds = undelivered.map((m) => m._id);

          // Persist: push deliveredTo entry only for messages that don't already have it
          // (use a filter so timestamps are only set once and duplicates avoided)
          await Message.updateMany(
            { _id: { $in: msgIds }, "deliveredTo.userId": { $ne: objectUserId } },
            { $push: { deliveredTo: { userId: objectUserId, deliveredAt } } }
          );

          // Emit events using the same deliveredAt timestamp
          for (const msg of undelivered) {
            const payload = {
              messageId: msg._id,
              chatId: msg.chatId,
              userId,          // the user who just came online
              deliveredAt,
            };

            // notify chat room (UI in chat room)
            io.in(chatRoom(String(msg.chatId))).emit(
              ChatEventEnum.MESSAGE_DELIVERED_EVENT,
              payload
            );

            // notify sender devices so they update ticks
            io.in(userRoom(String(msg.senderId))).emit(
              ChatEventEnum.MESSAGE_DELIVERED_EVENT,
              payload
            );

            // notify the recipient userRoom too (optional/redundant but safe)
            io.in(userRoom(String(userId))).emit(
              ChatEventEnum.MESSAGE_DELIVERED_EVENT,
              payload
            );
          }
        }
      }
    } catch (err) {
      console.warn("markDeviceOnline deliver failed:", err && err.stack ? err.stack : err);
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
  // ❗ DO NOT CHANGE DEVICE STATUS HERE
  if (deviceId) {
    await Device.updateOne(
      { userId, deviceId },
      { $set: { lastSeen: new Date() } }
    );
  }

  removeOnlineSocket(userId, socketId);

  // If user has ZERO sockets online -> user goes offline
  if (!onlineUsers.has(userId)) {
    const lastSeen = new Date();

    // update profile online status
    await Profile.updateOne(
      { userId },
      { $set: { isOnline: false, lastSeen } }
    );

    // Global broadcast
    io.emit(ChatEventEnum.USER_STATUS_UPDATED, {
      userId,
      isOnline: false,
      lastSeen,
    });

    // notify user's own devices
    io.in(userRoom(userId)).emit(ChatEventEnum.USER_OFFLINE_EVENT, {
      userId,
      deviceId,
      lastSeen,
    });
  }
  else {
    // Another socket still online for this user → device disconnected only
    io.in(userRoom(userId)).emit(ChatEventEnum.DEVICE_DISCONNECTED_EVENT, {
      userId,
      deviceId,
      socketId,
      timestamp: new Date(),
    });
  }
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

function mountCallEvents(socket, io) {
  forwardToChat(io, socket, ChatEventEnum.CALL_RINGING_EVENT);
  forwardToChat(io, socket, ChatEventEnum.CALL_ACCEPTED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.CALL_REJECTED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.CALL_ENDED_EVENT);
  forwardToChat(io, socket, ChatEventEnum.CALL_MISSED_EVENT);
}

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
    // mountGroupEvents(socket, io);
    mountProfileEvents(socket, io);
    mountCallEvents(socket, io);

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

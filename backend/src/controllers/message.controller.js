// messages.controller.js
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import ChatMember from "../models/chatMember.model.js";
import Pin from "../models/pin.model.js";

import {
  uploadMultipleOnCloudinary,
  deleteMultipleFromCloudinary,
} from "../utils/cloudinary.js";

import { chatRoom, emitSocketEvent, userRoom } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";

/* ====================================================================
   Helper: robust populateMessage (aggregation to guarantee fields)
   returns null if not found
==================================================================== */
async function populateMessage(msgId) {
  if (!msgId) return null;

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(msgId) } },

    // join sender profile
    {
      $lookup: {
        from: "profiles",
        localField: "senderId",
        foreignField: "userId",
        as: "senderProfile",
      },
    },
    { $unwind: { path: "$senderProfile", preserveNullAndEmptyArrays: true } },

    // join reply message
    {
      $lookup: {
        from: "messages",
        localField: "replyTo",
        foreignField: "_id",
        as: "replyMessage",
      },
    },
    { $unwind: { path: "$replyMessage", preserveNullAndEmptyArrays: true } },

    // lookup reply sender profile
    {
      $lookup: {
        from: "profiles",
        localField: "replyMessage.senderId",
        foreignField: "userId",
        as: "replySender",
      },
    },
    { $unwind: { path: "$replySender", preserveNullAndEmptyArrays: true } },

    // unwind reactions
    { $unwind: { path: "$reactions", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "profiles",
        localField: "reactions.userId",
        foreignField: "userId",
        as: "reactionsProfile",
      },
    },
    { $unwind: { path: "$reactionsProfile", preserveNullAndEmptyArrays: true } },

    {
      $addFields: {
        "reactions.user": {
          userId: "$reactionsProfile.userId",
          username: "$reactionsProfile.username",
          avatarUrl: "$reactionsProfile.avatarUrl",
        },
      },
    },

    {
      $group: {
        _id: "$_id",
        doc: { $first: "$$ROOT" },
        reactions: {
          $push: {
            $cond: [
              { $gt: [{ $ifNull: ["$reactions.userId", null] }, null] },
              "$reactions",
              "$$REMOVE",
            ],
          },
        },
      },
    },

    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$doc",
            { reactions: { $ifNull: ["$reactions", []] } },
          ],
        },
      },
    },

    {
      $project: {
        _id: 1,
        chatId: 1,
        senderId: 1,
        senderDeviceId: 1,
        ciphertext: 1,
        ciphertextNonce: 1,
        encryptedKeys: 1,
        type: 1,
        replyTo: 1,
        attachments: 1,
        deliveredTo: 1,
        readBy: 1,
        reactions: 1,
        pinned: 1,
        edited: 1,
        editHistory: 1,
        deleted: 1,
        createdAt: 1,
        updatedAt: 1,
        clientTempId: 1,

        sender: {
          userId: "$senderProfile.userId",
          username: "$senderProfile.username",
          avatarUrl: "$senderProfile.avatarUrl",
        },

        replyMessage: {
          _id: "$replyMessage._id",
          senderId: "$replyMessage.senderId",
          ciphertext: "$replyMessage.ciphertext",
          ciphertextNonce: "$replyMessage.ciphertextNonce",
          encryptedKeys: "$replyMessage.encryptedKeys",
          attachments: "$replyMessage.attachments",
          createdAt: "$replyMessage.createdAt",
          type: "$replyMessage.type",
          senderProfile: {
            userId: "$replySender.userId",
            username: "$replySender.username",
            avatarUrl: "$replySender.avatarUrl",
          },
        },
      },
    },
  ];

  const res = await Message.aggregate(pipeline);
  return res?.[0] || null;
}



/* ====================================================================
   sendMessage
   - creates message
   - always emits MESSAGE_RECEIVED_EVENT with a deliveredTo snapshot (if recipients online)
   - persists deliveredTo for online recipients and emits per-recipient MESSAGE_DELIVERED_EVENT
==================================================================== */
export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, ciphertext, ciphertextNonce, type, replyTo, clientTempId } = req.body;

  if (!chatId || !ciphertext || !ciphertextNonce)
    throw new ApiError(400, "Missing required fields");

  const senderDeviceId = req.headers["x-device-id"];
  if (!senderDeviceId) throw new ApiError(400, "Missing deviceId header");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  /* Parse encryptedKeys */
  let encryptedKeys = [];
  if (req.body.encryptedKeys) {
    try {
      const parsed = JSON.parse(req.body.encryptedKeys);
      encryptedKeys = Array.isArray(parsed)
        ? parsed
          .filter(
            (ek) =>
              ek.recipientUserId &&
              ek.recipientDeviceId &&
              ek.encryptedKey &&
              ek.senderEphemeralPublicKey &&
              ek.nonce
          )
          .map((ek) => ({
            recipientUserId: new mongoose.Types.ObjectId(ek.recipientUserId),
            recipientDeviceId: String(ek.recipientDeviceId),
            encryptedKey: String(ek.encryptedKey),
            senderEphemeralPublicKey: String(ek.senderEphemeralPublicKey),
            nonce: String(ek.nonce),
          }))
        : [];
    } catch {
      throw new ApiError(400, "Invalid encryptedKeys JSON");
    }
  }

  /* Handle attachments (cloudinary) */
  const attachments = [];

  if (req.files?.length > 0) {
    const uploaded = await uploadMultipleOnCloudinary(
      req.files.map((f) => f.path)
    );

    uploaded.forEach((u, i) => {
      attachments.push({
        filename: req.files[i].originalname,
        mimeType: req.files[i].mimetype,
        size: req.files[i].size,
        cloudinary: {
          public_id: u.public_id,
          resource_type: u.resource_type,   // "image", "video", or "raw"
          url: u.url,                       // keep original
          secure_url: u.secure_url,         // keep original
          bytes: u.bytes,
          width: u.width,
          height: u.height,
        },
        fileEncrypted: false,
        fileNonce: null
      });
    });
  }


  /* Create message */
  const msg = await Message.create({
    chatId,
    senderId: req.user._id,
    senderDeviceId,
    ciphertext,
    ciphertextNonce,
    clientTempId: clientTempId || null, // 🔥 ADD THIS
    type: type || (attachments.length ? "attachment" : "text"),
    replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : null,
    encryptedKeys,
    attachments,
  });


  /* Update chat status */
  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: msg._id,
    updatedAt: new Date(),
  });

  await ChatMember.updateMany(
    { chatId, userId: { $ne: req.user._id } },
    { $inc: { unreadCount: 1 } }
  );

  await ChatMember.updateOne(
    { chatId, userId: req.user._id },
    { lastSeenAt: new Date() }
  );

  // Fully populated message for FE (includes encryptedKeys & sender)
  const populatedMessage = await populateMessage(msg._id);

  // DELIVERY snapshot + persistence
  const io = req.app.get("io");
  const onlineMap = io?.socketUserMap;
  const members = await ChatMember.find({ chatId }).select("userId").lean();
  const memberIds = members
    .map((m) => String(m.userId))
    .filter((id) => id !== String(req.user._id));

  const now = new Date();
  const deliveredSnapshot = []; // { userId, deliveredAt }

  if (onlineMap) {
    const onlineRecipients = memberIds.filter((uid) =>
      onlineMap.has(String(uid))
    );
    for (const uid of onlineRecipients) {
      if (String(uid) !== String(req.user._id)) {
        deliveredSnapshot.push({ userId: uid, deliveredAt: now });
      }
    }
  }

  // Prepare message payload: include delivered snapshot so clients have initial state
  const messagePayload = {
    chatId,
    message: {
      ...populatedMessage,
      deliveredTo: [...(populatedMessage?.deliveredTo || []), ...deliveredSnapshot],
    },
    actorId: req.user._id.toString(),
    timestamp: populatedMessage.createdAt || new Date(),
  };

  // Emit NEW message (chat room + each user's userRoom)
  emitSocketEvent(req, "chat", chatId.toString(), ChatEventEnum.MESSAGE_RECEIVED_EVENT, messagePayload);
  for (const uid of memberIds) {
    emitSocketEvent(req, "user", uid, ChatEventEnum.MESSAGE_RECEIVED_EVENT, messagePayload);
  }
  // also emit to sender devices so sender UI updates consistently
  emitSocketEvent(req, "user", req.user._id.toString(), ChatEventEnum.MESSAGE_RECEIVED_EVENT, messagePayload);

  // Persist deliveredTo for online recipients and emit per-recipient delivered events
  if (deliveredSnapshot.length > 0 && io) {
    try {
      const toPersist = deliveredSnapshot.map((d) => ({ userId: new mongoose.Types.ObjectId(d.userId), deliveredAt: d.deliveredAt }));
      // avoid duplicates when possible
      await Message.updateMany(
        {
          _id: msg._id,
          "deliveredTo.userId": { $nin: toPersist.map(tp => tp.userId) },
          senderId: { $ne: req.user._id }, // sender should never be delivered entry
        },
        { $push: { deliveredTo: { $each: toPersist } } }
      );

      for (const d of deliveredSnapshot) {
        const payload = { messageId: msg._id, chatId, userId: d.userId, deliveredAt: d.deliveredAt };
        // notify sender devices
        io.in(userRoom(String(req.user._id))).emit(ChatEventEnum.MESSAGE_DELIVERED_EVENT, payload);
        // notify recipient devices
        io.in(userRoom(String(d.userId))).emit(ChatEventEnum.MESSAGE_DELIVERED_EVENT, payload);
        // notify chat room too
        io.in(chatRoom(String(chatId))).emit(ChatEventEnum.MESSAGE_DELIVERED_EVENT, payload);
      }
    } catch (err) {
      console.warn("sendMessage: persist/emit deliveredSnapshot failed:", err && err.stack ? err.stack : err);
    }
  }

  return res.status(201).json(new ApiResponse(201, populatedMessage, "Message sent"));
});

/* ====================================================================
   2️⃣ EDIT MESSAGE
==================================================================== */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { ciphertext, ciphertextNonce } = req.body;

  if (!ciphertext || !ciphertextNonce)
    throw new ApiError(400, "Missing ciphertext or nonce");

  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  if (message.senderId.toString() !== req.user._id.toString())
    throw new ApiError(403, "Not your message");

  message.editHistory.push({
    ciphertext: message.ciphertext,
    ciphertextNonce: message.ciphertextNonce,
    editedAt: new Date(),
    editedByDeviceId: req.headers["x-device-id"],
  });

  message.ciphertext = ciphertext;
  message.ciphertextNonce = ciphertextNonce;
  message.edited = true;
  await message.save();

  const fresh = await populateMessage(messageId);

  emitSocketEvent(
    req,
    "chat",
    message.chatId.toString(),
    ChatEventEnum.MESSAGE_EDIT_EVENT,
    {
      chatId: message.chatId.toString(),
      message: fresh,
      actorId: req.user._id.toString(),
      timestamp: new Date(),
    }
  );

  return res.json(new ApiResponse(200, fresh, "Message edited"));
});

/* ====================================================================
   3️⃣ DELETE MESSAGE
==================================================================== */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const forEveryone =
    String(req.query.forEveryone).toLowerCase() === "true";

  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  const isSender = message.senderId.toString() === req.user._id.toString();

  const chat = await Chat.findById(message.chatId).select("isGroup");
  if (!chat) throw new ApiError(404, "Chat not found");

  let isAdmin = false;

  if (chat.isGroup) {
    const member = await ChatMember.findOne({
      chatId: message.chatId,
      userId: req.user._id,
    }).select("role");

    isAdmin = member?.role === "admin";
  }

  if (forEveryone) {
    if (!chat.isGroup && !isSender) {
      throw new ApiError(403, "Only sender can delete for everyone");
    }

    if (chat.isGroup && !isSender && !isAdmin) {
      throw new ApiError(403, "Only sender or admin can delete this message");
    }
  }


  // ⚡ store pinned flag BEFORE editing
  const wasPinned = message.pinned === true;

  if (forEveryone) {
    message.deleted = true;

    // ⭐ FIRST: auto-unpin if pinned
    if (wasPinned) {
      await Pin.deleteOne({ chatId: message.chatId, messageId });

      await Chat.findByIdAndUpdate(message.chatId, {
        $pull: { pinnedMessageIds: messageId },
      });

      message.pinned = false;

      // ⚡ Broadcast unpin event
      emitSocketEvent(
        req,
        "chat",
        message.chatId.toString(),
        ChatEventEnum.MESSAGE_UNPIN_EVENT,
        {
          chatId: message.chatId.toString(),
          messageId: messageId.toString(),
          actorId: req.user._id.toString(),
          timestamp: new Date(),
        }
      );
    }

    // ⚡ collect public IDs BEFORE wiping attachments
    const publicIds = (message.attachments || [])
      .map(att => att.cloudinary?.public_id)
      .filter(Boolean);

    message.attachments = [];

    if (publicIds.length > 0) {
      try {
        await deleteMultipleFromCloudinary(publicIds);
      } catch (err) {
        console.warn("Cloudinary delete failed:", err?.message || err);
      }
    }

    await message.save();
  } else {
    // delete only for this user
    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { deletedFor: req.user._id } }
    );
  }

  // ⭐ Fetch fresh populated message after changes
  const fresh = await populateMessage(messageId);

  const deletePayload = {
    chatId: message.chatId.toString(),
    message: fresh,
    actorId: req.user._id.toString(),
    timestamp: new Date(),
    forEveryone,
  };

  // 🔥 Broadcast DELETE event to chat members
  emitSocketEvent(
    req,
    "chat",
    message.chatId.toString(),
    ChatEventEnum.MESSAGE_DELETE_EVENT,
    deletePayload
  );

  // Send to each participant's personal room
  const members = await ChatMember.find({ chatId: message.chatId })
    .select("userId")
    .lean();

  for (const mem of members) {
    emitSocketEvent(
      req,
      "user",
      mem.userId.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      deletePayload
    );
  }

  return res.json(new ApiResponse(200, fresh, "Message deleted"));
});



export const clearChatForUser = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, "Invalid chatId");
  }

  // verify membership
  const member = await ChatMember.findOne({ chatId, userId });
  if (!member) throw new ApiError(403, "Access denied");

  const now = new Date();

  // Mark messages deleted only for this user (but keep globally visible)
  await Message.updateMany(
    {
      chatId,
      "deletedFor": { $ne: userId }
    },
    { $push: { deletedFor: userId } }
  );

  // Reset unread + update lastSeen
  await ChatMember.updateOne(
    { chatId, userId },
    { $set: { unreadCount: 0, lastSeenAt: now } }
  );

  // Emit read/reset event
  emitSocketEvent(req, "chat", chatId.toString(), ChatEventEnum.CHAT_CLEARED_EVENT, {
    chatId: chatId.toString(),
    userId: userId.toString(),
    timestamp: now,
  });

  return res.json(new ApiResponse(200, null, "Chat cleared for you"));
});



/* ====================================================================
   4️⃣ GET MESSAGES (paginated)
==================================================================== */
export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 25 } = req.query;

  const skip = (page - 1) * limit;

  // First fetch paginated message IDs
  const ids = await Message.find({ chatId })
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit))
    .select("_id")
    .lean();

  if (ids.length === 0)
    return res.json(new ApiResponse(200, [], "Messages fetched"));

  // Populate each message fully (replyMessage included)
  const populated = await Promise.all(
    ids.map(async (m) => await populateMessage(m._id))
  );

  // preserve ascending order for FE
  const ordered = populated.filter(Boolean).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  return res.json(
    new ApiResponse(200, ordered, "Messages fetched")
  );
});


/* ====================================================================
   5️⃣ DELIVERY & READ RECEIPTS
==================================================================== */
export const markAsDelivered = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { messageId, deliveredUpToId } = req.body || {};
  const userIdObj = new mongoose.Types.ObjectId(req.user._id);
  const now = new Date();

  // helper to persist one message id
  const persistDeliveredForIds = async (ids = []) => {
    if (!ids.length) return [];
    // persist once only
    await Message.updateMany(
      {
        _id: { $in: ids },
        senderId: { $ne: userIdObj },
        "deliveredTo.userId": { $ne: userIdObj },
      },
      { $push: { deliveredTo: { userId: userIdObj, deliveredAt: now } } }
    );
    return ids;
  };

  if (messageId) {
    await persistDeliveredForIds([messageId]);

    // emit single delivered event
    const payload = { messageId, chatId, userId: req.user._id.toString(), deliveredAt: now };
    emitSocketEvent(req, "chat", chatId.toString(), ChatEventEnum.MESSAGE_DELIVERED_EVENT, payload);
    emitSocketEvent(req, "user", req.user._id.toString(), ChatEventEnum.MESSAGE_DELIVERED_EVENT, payload);

    return res.json(new ApiResponse(200, null, "Delivered updated for message"));
  }

  // deliveredUpToId -> compute cutoff
  let cutoff = null;
  if (deliveredUpToId) {
    const target = await Message.findById(deliveredUpToId).select("createdAt").lean();
    if (!target) throw new ApiError(400, "Invalid deliveredUpToId");
    cutoff = target.createdAt;
  }

  // find undelivered messages in chat (optionally <= cutoff)
  const q = {
    chatId: new mongoose.Types.ObjectId(chatId),
    senderId: { $ne: userIdObj },
    "deliveredTo.userId": { $ne: userIdObj },
    deleted: false,
  };
  if (cutoff) q.createdAt = { $lte: cutoff };

  const undelivered = await Message.find(q).select("_id chatId senderId createdAt").limit(1000).lean();
  const ids = undelivered.map(m => m._id);

  await persistDeliveredForIds(ids);

  // emit per-message events (so sender gets ticks)
  for (const m of undelivered) {
    const payload = { messageId: m._id, chatId: m.chatId, userId: req.user._id.toString(), deliveredAt: now };
    emitSocketEvent(req, "chat", String(m.chatId), ChatEventEnum.MESSAGE_DELIVERED_EVENT, payload);
    if (m.senderId) emitSocketEvent(req, "user", String(m.senderId), ChatEventEnum.MESSAGE_DELIVERED_EVENT, payload);
  }

  return res.json(new ApiResponse(200, null, "Delivered updated"));
});


export const markAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { readUpToId, readAt } = req.body || {};
  const userIdObj = new mongoose.Types.ObjectId(req.user._id);
  const now = new Date();

  // Determine cutoff: if readUpToId => use that message's createdAt, else if readAt provided use it, else use now
  let cutoffDate = readAt ? new Date(readAt) : now;
  if (readUpToId) {
    const target = await Message.findById(readUpToId).select("createdAt").lean();
    if (!target) throw new ApiError(400, "Invalid readUpToId");
    cutoffDate = target.createdAt || cutoffDate;
  }

  // Only update messages in chat, not sent by the reader, not already read by reader, not deleted,
  // and createdAt <= cutoffDate
  const filter = {
    chatId: new mongoose.Types.ObjectId(chatId),
    deleted: false,
    senderId: { $ne: userIdObj },
    "readBy.userId": { $ne: userIdObj },
    createdAt: { $lte: cutoffDate },
  };

  // persist readBy entries
  await Message.updateMany(
    filter,
    { $push: { readBy: { userId: userIdObj, readAt: now } } }
  );

  // reset unread & update ChatMember (set unread = 0)
  await ChatMember.updateOne(
    { chatId: new mongoose.Types.ObjectId(chatId), userId: userIdObj },
    { $set: { unreadCount: 0, lastSeenAt: now } }
  );

  // Emit chat-level read event with readUpToId/readAt so clients can apply deterministically
  emitSocketEvent(
    req,
    "chat",
    chatId.toString(),
    ChatEventEnum.MESSAGE_READ_EVENT,
    {
      chatId: chatId.toString(),
      userId: req.user._id.toString(),
      readAt: now,
      lastSeenAt: now,
      readUpToId: readUpToId || null,
    }
  );

  return res.json(new ApiResponse(200, null, "Read receipts updated"));
});


/* ====================================================================
   6️⃣ REACTIONS
==================================================================== */
export const getReactions = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.query;

  if (!mongoose.Types.ObjectId.isValid(messageId))
    throw new ApiError(400, "Invalid messageId");

  const msg = await Message.findById(messageId).select("chatId").lean();
  if (!msg) throw new ApiError(404, "Message not found");

  // ensure requester is a member of the chat
  const member = await ChatMember.findOne({ chatId: msg.chatId, userId: req.user._id }).lean();
  if (!member) throw new ApiError(403, "Access denied");

  // Aggregation: unwind reactions, lookup reactor profile, group by emoji
  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(messageId) } },
    { $unwind: { path: "$reactions", preserveNullAndEmptyArrays: true } },
    // optional emoji filter
    ...(emoji ? [{ $match: { "reactions.reaction": String(emoji) } }] : []),
    // lookup profile for each reactor
    {
      $lookup: {
        from: "profiles",
        localField: "reactions.userId",
        foreignField: "userId",
        as: "reactorProfile",
      },
    },
    { $unwind: { path: "$reactorProfile", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        reaction: "$reactions.reaction",
        reactedAt: "$reactions.createdAt",
        userId: "$reactions.userId",
        username: "$reactorProfile.username",
        avatarUrl: "$reactorProfile.avatarUrl",
      },
    },
    // group by reaction glyph
    {
      $group: {
        _id: "$reaction",
        count: { $sum: 1 },
        users: {
          $push: {
            userId: "$userId",
            username: "$username",
            avatarUrl: "$avatarUrl",
            reactedAt: "$reactedAt",
          },
        },
      },
    },
    { $project: { _id: 0, emoji: "$_id", count: 1, users: 1 } },
    // stable sort: most used first
    { $sort: { count: -1, emoji: 1 } },
  ];

  const resArr = await Message.aggregate(pipeline);

  // If there are no reactions, aggregate returns [] — return consistent shape
  return res.json(new ApiResponse(200, resArr || [], "Reactions fetched"));
});

export const addReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { reaction } = req.body;

  if (!reaction) throw new ApiError(400, "Reaction required");

  // ensure message exists
  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  // Remove any previous reaction by this user (enforce one reaction per user)
  await Message.updateOne(
    { _id: messageId },
    { $pull: { reactions: { userId: req.user._id } } }
  );

  // Push new reaction (with createdAt)
  await Message.updateOne(
    { _id: messageId },
    {
      $push: { reactions: { userId: req.user._id, reaction, createdAt: new Date() } },
    }
  );

  const fresh = await populateMessage(messageId);

  emitSocketEvent(
    req,
    "chat",
    fresh.chatId.toString(),
    ChatEventEnum.MESSAGE_REACTION_ADDED_EVENT,
    {
      chatId: fresh.chatId.toString(),
      messageId: messageId.toString(),
      reaction,
      byUserId: req.user._id.toString(),
      message: fresh,
      timestamp: new Date(),
    }
  );

  return res.json(new ApiResponse(200, fresh, "Reaction added"));
});

export const removeReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  await Message.updateOne(
    { _id: messageId },
    { $pull: { reactions: { userId: req.user._id } } }
  );

  const fresh = await populateMessage(messageId);

  emitSocketEvent(
    req,
    "chat",
    fresh.chatId.toString(),
    ChatEventEnum.MESSAGE_REACTION_REMOVED_EVENT,
    {
      chatId: fresh.chatId.toString(),
      messageId: messageId.toString(),
      byUserId: req.user._id.toString(),
      message: fresh,
      timestamp: new Date(),
    }
  );

  return res.json(new ApiResponse(200, fresh, "Reaction removed"));
});


/* ====================================================================
   7️⃣ PIN / UNPIN MESSAGE
==================================================================== */
export const pinMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const exists = await Pin.findOne({ chatId, messageId });
  if (exists) throw new ApiError(400, "Already pinned");

  await Pin.create({ chatId, messageId, pinnedBy: req.user._id });
  await Chat.findByIdAndUpdate(chatId, {
    $addToSet: { pinnedMessageIds: messageId },
  });
  await Message.findByIdAndUpdate(messageId, { pinned: true });

  const fresh = await populateMessage(messageId);

  emitSocketEvent(
    req,
    "chat",
    chatId.toString(),
    ChatEventEnum.MESSAGE_PIN_EVENT,
    {
      chatId: chatId.toString(),
      messageId: messageId.toString(),
      message: fresh,
      actorId: req.user._id.toString(),
      timestamp: new Date(),
    }
  );

  return res.json(new ApiResponse(200, fresh, "Pinned"));
});

export const unpinMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  await Pin.deleteOne({ chatId, messageId });
  await Chat.findByIdAndUpdate(chatId, {
    $pull: { pinnedMessageIds: messageId },
  });
  await Message.findByIdAndUpdate(messageId, { pinned: false });

  const fresh = await populateMessage(messageId);

  emitSocketEvent(
    req,
    "chat",
    chatId.toString(),
    ChatEventEnum.MESSAGE_UNPIN_EVENT,
    {
      chatId: chatId.toString(),
      messageId: messageId.toString(),
      message: fresh,
      actorId: req.user._id.toString(),
      timestamp: new Date(),
    }
  );

  return res.json(new ApiResponse(200, fresh, "Unpinned"));
});

/* ====================================================================
   8️⃣ GET PINNED MESSAGES
==================================================================== */
export const getPinnedMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, "Invalid chatId");
  }

  // Find Pin entries for the chat, ordered by pinnedAt desc
  const pins = await Pin.find({ chatId })
    .sort({ pinnedAt: -1 })
    .lean();

  // For each pin, load a fully populated message via populateMessage
  const msgs = await Promise.all(
    pins.map(async (p) => {
      try {
        const m = await populateMessage(p.messageId);
        // attach pinned metadata
        if (m) {
          return {
            ...m,
            pinnedAt: p.pinnedAt || p.createdAt || null,
            pinId: p._id,
          };
        }
        return null;
      } catch (err) {
        return null;
      }
    })
  );

  // Filter out missing messages and return
  const result = msgs.filter(Boolean);

  return res.json(new ApiResponse(200, result, "Pinned messages fetched"));
});


/* ====================================================================
   9️⃣ Chat media/docs
==================================================================== */
export const getChatMedia = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }

    const member = await ChatMember.findOne({ chatId, userId });
    if (!member) return res.status(403).json({ message: "Access denied" });

    const media = await Message.aggregate([
      { $match: { chatId: new mongoose.Types.ObjectId(chatId), deleted: false } },
      { $unwind: "$attachments" },
      { $match: { "attachments.mimeType": { $regex: /^(image|video|audio)\//i } } },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          "attachments.filename": 1,
          "attachments.mimeType": 1,
          "attachments.cloudinary.secure_url": 1,
          "attachments.cloudinary.url": 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: media.map((m) => ({
        _id: m._id,
        url: m.attachments.cloudinary.url,
        filename: m.attachments.filename,
        mimeType: m.attachments.mimeType,
        createdAt: m.createdAt
      }))
    });

  } catch (err) {
    console.error("MEDIA FETCH ERROR:", err);
    return res.status(500).json({ message: "Failed to load media" });
  }
};

export const getChatDocuments = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }

    const member = await ChatMember.findOne({ chatId, userId });
    if (!member) return res.status(403).json({ message: "Access denied" });

    const docs = await Message.aggregate([
      { $match: { chatId: new mongoose.Types.ObjectId(chatId), deleted: false } },
      { $unwind: "$attachments" },
      { $match: { "attachments.mimeType": { $regex: /^(application|text)\//i } } },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          "attachments.filename": 1,
          "attachments.size": 1,
          "attachments.mimeType": 1,
          "attachments.cloudinary.secure_url": 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: docs.map((d) => ({
        _id: d._id,
        url: d.attachments.cloudinary.secure_url,
        filename: d.attachments.filename,
        size: d.attachments.size,
        mimeType: d.attachments.mimeType,
        createdAt: d.createdAt
      }))
    });

  } catch (err) {
    console.error("DOC FETCH ERROR:", err);
    return res.status(500).json({ message: "Failed to load documents" });
  }
};

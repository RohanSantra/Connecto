import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Chat from "../models/chat.model.js";
import ChatMember from "../models/chatMember.model.js";
import Message from "../models/message.model.js";
import Profile from "../models/profile.model.js";
import Device from "../models/device.model.js";
import mongoose from "mongoose";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
} from "../utils/cloudinary.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";
import Block from "../models/block.model.js";

/* ============================================================
   HELPER — Emit chat update to ALL members (by user room)
   ============================================================ */
async function emitChatToAllMembers(req, chatId, event, payload) {
  const members = await ChatMember.find({ chatId }).select("userId").lean();
  members.forEach((m) => {
    emitSocketEvent(req, "user", m.userId.toString(), event, payload);
  });
}

/* ============================================================
   INTERNAL — Build participants[]
   ============================================================ */
async function buildParticipants(members, profileLookup) {
  const map = new Map(profileLookup.map((p) => [String(p.userId), p]));

  return members.map((m) => {
    const prof = map.get(String(m.userId));
    return {
      userId: m.userId,
      role: m.role,
      lastSeen: m.lastSeenAt || null,
      username: prof?.username || "Unknown",
      avatarUrl: prof?.avatarUrl || null,
      bio: prof?.bio || null,
      isOnline: prof?.isOnline || false,
      isDeactivated: prof?.isDeactivated || false,
    };
  });
}

/* ============================================================
   INTERNAL — getFullChat(chatId)
   returns unified participants[]
   ============================================================ */
async function getFullChat(chatId, currentUserId) {
  const id = new mongoose.Types.ObjectId(chatId);

  const result = await Chat.aggregate([
    { $match: { _id: id } },

    {
      $lookup: {
        from: "chatmembers",
        localField: "_id",
        foreignField: "chatId",
        as: "members",
      },
    },

    {
      $lookup: {
        from: "profiles",
        let: { ids: "$members.userId" },
        pipeline: [{ $match: { $expr: { $in: ["$userId", "$$ids"] } } }],
        as: "profileLookup",
      },
    },

    // optimized last message fetch
    {
      $lookup: {
        from: "messages",
        let: { cid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$chatId", "$$cid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "lastMessage",
      },
    },
    { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        isGroup: 1,
        name: 1,
        description: 1,
        groupAvatarUrl: 1,
        members: 1,
        profileLookup: 1,
        lastMessage: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!result.length) return null;

  const chat = result[0];
  chat.participants = await buildParticipants(chat.members, chat.profileLookup);

  const my = chat.members.find(
    (m) => String(m.userId) === String(currentUserId)
  );
  chat.unreadCount = my?.unreadCount || 0;

  delete chat.members;
  delete chat.profileLookup;

  chat.chatId = chat._id;
  return chat;
}

/* ============================================================
   1️⃣ CREATE ONE-TO-ONE CHAT
   ============================================================ */
export const createOneToOneChat = asyncHandler(async (req, res) => {
  const { participantId } = req.body;

  if (!participantId) throw new ApiError(400, "Participant ID required");
  if (participantId === req.user._id.toString())
    throw new ApiError(400, "Cannot chat with yourself");

  // check existing
  const existing = await ChatMember.aggregate([
    { $match: { userId: req.user._id } },
    {
      $lookup: {
        from: "chatmembers",
        localField: "chatId",
        foreignField: "chatId",
        as: "members",
      },
    },
    {
      $match: {
        "members.userId": new mongoose.Types.ObjectId(participantId),
      },
    },
    {
      $lookup: {
        from: "chats",
        localField: "chatId",
        foreignField: "_id",
        as: "chat",
      },
    },
    { $unwind: "$chat" },
    { $match: { "chat.isGroup": false } },
  ]);

  if (existing.length) {
    const full = await getFullChat(existing[0].chat._id, req.user._id);
    return res
      .status(200)
      .json(new ApiResponse(200, full, "Chat already exists"));
  }

  // create new
  const newChat = await Chat.create({
    isGroup: false,
    creator: req.user._id,
  });

  await ChatMember.insertMany([
    { chatId: newChat._id, userId: req.user._id },
    { chatId: newChat._id, userId: participantId },
  ]);

  const chat = await getFullChat(newChat._id, req.user._id);

  emitSocketEvent(
    req,
    "user",
    participantId.toString(),
    ChatEventEnum.NEW_CHAT_EVENT,
    { chat }
  );

  emitSocketEvent(
    req,
    "user",
    req.user._id.toString(),
    ChatEventEnum.NEW_CHAT_EVENT,
    { chat }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, chat, "One-to-one chat created"));
});

/* ============================================================
   2️⃣ CREATE GROUP CHAT
   ============================================================ */
export const createGroupChat = asyncHandler(async (req, res) => {
  let { name, memberIds = [], description } = req.body;

  if (typeof memberIds === "string") {
    try {
      memberIds = JSON.parse(memberIds);
    } catch {
      throw new ApiError(400, "Invalid memberIds format");
    }
  }

  const avatarFile = req.file?.path;
  let avatarUrl = null;

  if (avatarFile) {
    const uploaded = await uploadOnCloudinary(avatarFile);
    if (!uploaded) throw new ApiError(500, "Group avatar upload failed");
    avatarUrl = uploaded.secure_url;
  }

  const all = [...new Set([...memberIds, req.user._id.toString()])];

  const newChat = await Chat.create({
    isGroup: true,
    name,
    description,
    creator: req.user._id,
    groupAvatarUrl: avatarUrl,
  });

  await ChatMember.insertMany(
    all.map((id) => ({
      chatId: newChat._id,
      userId: id,
      role: id === req.user._id.toString() ? "admin" : "member",
    }))
  );

  const chat = await getFullChat(newChat._id, req.user._id);

  // notify all members
  await emitChatToAllMembers(req, newChat._id, ChatEventEnum.NEW_CHAT_EVENT, {
    chat,
  });

  return res.status(201).json(new ApiResponse(201, chat, "Group created"));
});

/* ============================================================
   3️⃣ RENAME GROUP
   ============================================================ */
export const renameGroup = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { newName, description, settings } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroup) throw new ApiError(404, "Group not found");

  const me = await ChatMember.findOne({
    chatId,
    userId: req.user._id,
  });
  if (!me) throw new ApiError(403, "Not a member");

  const canRename =
    me.role === "admin" || (chat.settings && chat.settings.allowAnyoneToRename);

  if (!canRename) throw new ApiError(403, "No permission");

  if (newName) chat.name = newName;
  if (description !== undefined) chat.description = description;
  if (settings) chat.settings = { ...(chat.settings || {}), ...settings };

  await chat.save();

  const updated = await getFullChat(chatId, req.user._id);

  // emit to all members (to update sidebar, etc.)
  await emitChatToAllMembers(
    req,
    chatId,
    ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
    { chat: updated }
  );

  return res.status(200).json(new ApiResponse(200, updated, "Updated"));
});

/* ============================================================
   4️⃣ UPDATE GROUP AVATAR
   ============================================================ */
export const updateGroupAvatar = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!req.file) throw new ApiError(400, "No file uploaded");

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroup) throw new ApiError(404, "Group not found");

  const me = await ChatMember.findOne({
    chatId,
    userId: req.user._id,
  });

  if (!me) throw new ApiError(403, "Not a member");

  const canChange =
    me.role === "admin" ||
    (chat.settings && chat.settings.allowAnyoneToChangeAvatar);

  if (!canChange) throw new ApiError(403, "No permission");

  if (chat.groupAvatarPublicId) {
    try {
      await deleteFromCloudinary(chat.groupAvatarPublicId);
    } catch {
      /* ignore deletion errors */
    }
  }

  const upload = await uploadOnCloudinary(req.file.path);
  if (!upload?.secure_url) throw new ApiError(500, "Upload failed");

  chat.groupAvatarUrl = upload.secure_url;
  chat.groupAvatarPublicId = upload.public_id;
  await chat.save();

  const updated = await getFullChat(chatId, req.user._id);

  await emitChatToAllMembers(
    req,
    chatId,
    ChatEventEnum.UPDATE_GROUP_AVATAR_EVENT,
    { chat: updated }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Avatar updated"));
});

/* ============================================================
   5️⃣ ADD MEMBER
   ============================================================ */
export const addGroupMember = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  if (!userId) throw new ApiError(400, "userId required");

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroup) throw new ApiError(404, "Group not found");

  const me = await ChatMember.findOne({ chatId, userId: req.user._id });
  const canAdd =
    me?.role === "admin" ||
    (chat.settings && chat.settings.allowAnyoneToAddMembers);

  if (!canAdd) throw new ApiError(403, "No permission");

  /* 🛑 BLOCK CHECK */
  const blockExists = await Block.exists({
    type: "user",
    $or: [
      { blockedBy: req.user._id, blockedUser: userId }, // I blocked them
      { blockedBy: userId, blockedUser: req.user._id }  // They blocked me
    ]
  });

  if (blockExists)
    throw new ApiError(403, "Cannot add user due to block relationship");

  const exists = await ChatMember.findOne({ chatId, userId });
  if (exists) throw new ApiError(400, "Already in group");

  await ChatMember.create({ chatId, userId, role: "member" });

  const updated = await getFullChat(chatId, req.user._id);

  await emitChatToAllMembers(
    req,
    chatId,
    ChatEventEnum.GROUP_MEMBER_ADDED_EVENT,
    { chat: updated }
  );

  emitSocketEvent(req, "user", userId, ChatEventEnum.NEW_CHAT_EVENT, {
    chat: updated,
  });

  return res.status(200).json(new ApiResponse(200, updated, "Member added"));
});


/* ============================================================
   6️⃣ REMOVE MEMBER
   ============================================================ */
export const removeGroupMember = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroup) throw new ApiError(404, "Group not found");

  const admins = await ChatMember.countDocuments({ chatId, role: "admin" });
  const target = await ChatMember.findOne({ chatId, userId });

  if (!target) throw new ApiError(404, "User not found in group");

  if (target.role === "admin" && admins <= 1) {
    throw new ApiError(400, "Group must have at least one admin");
  }

  const me = await ChatMember.findOne({
    chatId,
    userId: req.user._id,
  });

  const canRemove =
    me?.role === "admin" ||
    (chat.settings && chat.settings.allowAnyoneToRemoveMembers);

  if (!canRemove && req.user._id.toString() !== userId)
    throw new ApiError(403, "No permission");

  await ChatMember.deleteOne({ chatId, userId });

  const updated = await getFullChat(chatId, req.user._id);

  // notify remaining members
  await emitChatToAllMembers(
    req,
    chatId,
    ChatEventEnum.GROUP_MEMBER_REMOVED_EVENT,
    { chat: updated }
  );

  // notify removed user specifically (so their UI can remove the chat)
  if (userId !== req.user._id.toString()) {
    emitSocketEvent(req, "user", userId, ChatEventEnum.CHAT_DELETED_EVENT, {
      chatId,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Member removed"));
});

/* ============================================================
   7️⃣ PROMOTE MEMBER
   ============================================================ */
export const promoteMember = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  const admin = await ChatMember.findOne({
    chatId,
    userId: req.user._id,
    role: "admin",
  });

  if (!admin) throw new ApiError(403, "Not allowed");

  const member = await ChatMember.findOne({ chatId, userId });
  if (!member) throw new ApiError(404, "User not found");

  member.role = "admin";
  await member.save();

  const updated = await getFullChat(chatId, req.user._id);

  await emitChatToAllMembers(
    req,
    chatId,
    ChatEventEnum.MEMBER_PROMOTED_EVENT,
    { chat: updated }
  );

  return res.status(200).json(new ApiResponse(200, updated, "Promoted"));
});

/* ============================================================
   8️⃣ DEMOTE MEMBER
   ============================================================ */
export const demoteMember = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  const admin = await ChatMember.findOne({
    chatId,
    userId: req.user._id,
    role: "admin",
  });

  if (!admin) throw new ApiError(403, "Not allowed");

  const member = await ChatMember.findOne({ chatId, userId });
  if (!member) throw new ApiError(404, "Not found");

  const chat = await Chat.findById(chatId);

  if (String(member.userId) === String(chat.creator))
    throw new ApiError(403, "Cannot demote creator");

  member.role = "member";
  await member.save();

  const updated = await getFullChat(chatId, req.user._id);

  await emitChatToAllMembers(
    req,
    chatId,
    ChatEventEnum.MEMBER_DEMOTED_EVENT,
    { chat: updated }
  );

  return res.status(200).json(new ApiResponse(200, updated, "Demoted"));
});

/* ============================================================
   9️⃣ DELETE CHAT
   ============================================================ */
export const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  // Permission check
  if (chat.isGroup) {
    const admin = await ChatMember.findOne({
      chatId,
      userId: req.user._id,
      role: "admin",
    });

    if (!admin) throw new ApiError(403, "Only admins can delete group");
  }

  // fetch members first
  const members = await ChatMember.find({ chatId }).select("userId").lean();

  // 1️⃣ Get attachments
  const messages = await Message.find({ chatId }).select("attachments").lean();
  const publicIds = [];
  for (const msg of messages) {
    if (Array.isArray(msg.attachments)) {
      msg.attachments.forEach((att) => {
        const pid = att?.cloudinary?.public_id;
        if (pid) publicIds.push(pid);
      });
    }
  }

  // optionally delete attachments from cloudinary if you want
  if (publicIds.length) {
    try {
      await deleteMultipleFromCloudinary(publicIds);
    } catch {
      // ignore deletion errors
    }
  }

  // 2️⃣ DELETE DATABASE DATA
  await Chat.deleteOne({ _id: chatId });
  await ChatMember.deleteMany({ chatId });
  await Message.deleteMany({ chatId });

  // 3️⃣ NOW EMIT TO ALL USERS DIRECTLY
  members.forEach((m) => {
    emitSocketEvent(
      req,
      "user",
      m.userId.toString(),
      ChatEventEnum.CHAT_DELETED_EVENT,
      { chatId }
    );
  });

  // 4️⃣ Respond
  res.status(200).json(new ApiResponse(200, null, "Chat deleted"));
});

/* ============================================================
   🔟 PIN / UNPIN CHAT
   ============================================================ */
export const pinChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  await ChatMember.findOneAndUpdate(
    { chatId, userId: req.user._id },
    { pinned: true }
  );

  emitSocketEvent(
    req,
    "user",
    req.user._id,
    ChatEventEnum.CHAT_PINNED_EVENT,
    { chatId, pinned: true }
  );

  res.status(200).json(new ApiResponse(200, null, "Pinned"));
});

export const unpinChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  await ChatMember.findOneAndUpdate(
    { chatId, userId: req.user._id },
    { pinned: false }
  );

  emitSocketEvent(
    req,
    "user",
    req.user._id,
    ChatEventEnum.CHAT_UNPINNED_EVENT,
    { chatId, pinned: false }
  );

  res.status(200).json(new ApiResponse(200, null, "Unpinned"));
});

/* ============================================================
   1️⃣1️⃣ GET ALL CHATS
   ============================================================ */
export const getAllChats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  /* -------------------------------------------------- */
  /* 1️⃣ LOAD BLOCK RELATIONS                           */
  /* -------------------------------------------------- */
  const blocks = await Block.find({
    $or: [
      { blockedBy: userId },
      { blockedUser: userId, type: "user" }
    ]
  }).lean();

  const blockedUsers = new Set();      // users I blocked
  const blockedChats = new Set();      // chats I blocked
  const blockedByOthers = new Set();   // users who blocked me

  blocks.forEach(b => {
    if (b.type === "user" && String(b.blockedBy) === String(userId)) {
      blockedUsers.add(String(b.blockedUser));
    }

    if (b.type === "chat" && String(b.blockedBy) === String(userId)) {
      blockedChats.add(String(b.blockedChat));
    }

    if (b.type === "user" && String(b.blockedUser) === String(userId)) {
      blockedByOthers.add(String(b.blockedBy));
    }
  });

  /* -------------------------------------------------- */
  /* 2️⃣ FETCH CHATS                                    */
  /* -------------------------------------------------- */
  const result = await ChatMember.aggregate([
    { $match: { userId } },

    { $lookup: { from: "chats", localField: "chatId", foreignField: "_id", as: "chat" }},
    { $unwind: "$chat" },

    { $lookup: { from: "chatmembers", localField: "chatId", foreignField: "chatId", as: "members" }},

    {
      $lookup: {
        from: "profiles",
        let: { ids: "$members.userId" },
        pipeline: [{ $match: { $expr: { $in: ["$userId", "$$ids"] } } }],
        as: "profileLookup",
      },
    },

    {
      $lookup: {
        from: "messages",
        let: { cid: "$chatId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$chatId", "$$cid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "lastMessage",
      },
    },
    { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        chatId: 1,
        isGroup: "$chat.isGroup",
        name: "$chat.name",
        description: "$chat.description",
        groupAvatarUrl: "$chat.groupAvatarUrl",
        createdAt: "$chat.createdAt",
        members: 1,
        profileLookup: 1,
        lastMessage: 1,
        unreadCount: "$unreadCount",
        updatedAt: "$chat.updatedAt",
        pinned: { $ifNull: ["$pinned", false] },
      },
    },

    { $sort: { updatedAt: -1 } },
  ]);

  /* -------------------------------------------------- */
  /* 3️⃣ MAP + APPLY BLOCK LOGIC                        */
  /* -------------------------------------------------- */
  const chats = result.map((x) => {
    const isDirect = !x.isGroup;

    let hideLastMessage = false;
    let otherUserBlockedMe = false;

    // chat blocked by me
    if (blockedChats.has(String(x.chatId))) {
      hideLastMessage = true;
    }

    if (isDirect) {
      const other = x.members.find(
        m => String(m.userId) !== String(userId)
      );

      if (other) {
        // I blocked them
        if (blockedUsers.has(String(other.userId))) {
          hideLastMessage = true;
        }

        // They blocked me
        if (blockedByOthers.has(String(other.userId))) {
          otherUserBlockedMe = true;
          hideLastMessage = true;
        }
      }
    }

    return {
      chatId: x.chatId,
      isGroup: x.isGroup,
      name: x.name,
      description: x.description,
      groupAvatarUrl: x.groupAvatarUrl,
      otherUserBlockedMe,
      participants: x.members.map((m) => {
        const prof = x.profileLookup.find(
          (p) => String(p.userId) === String(m.userId)
        );
        return {
          userId: m.userId,
          role: m.role,
          username: prof?.username || "Unknown",
          avatarUrl: prof?.avatarUrl || null,
          isOnline: prof?.isOnline || false,
          lastSeenAt: prof?.lastSeenAt || null,
          bio: prof?.bio || null,
          isDeactivated: prof?.isDeactivated || false,
        };
      }),
      lastMessage: hideLastMessage ? null : x.lastMessage || null,
      pinned: Boolean(x.pinned),
      unreadCount: hideLastMessage ? 0 : Number(x.unreadCount) || 0,
      createdAt: x.createdAt,
    };
  });

  res.status(200).json(new ApiResponse(200, chats, "Chats fetched"));
});


/* ============================================================
   1️⃣2️⃣ GET CHAT DETAILS
   ============================================================ */
export const getChatDetails = asyncHandler(async (req, res) => {
  const chatId = req.params.chatId;

  const isMember = await ChatMember.exists({
    chatId,
    userId: req.user._id,
  });
  if (!isMember) throw new ApiError(403, "Not a member");

  const chat = await getFullChat(chatId, req.user._id);
  if (!chat) throw new ApiError(404, "Chat not found");

  let otherUserId = null;

  if (!chat.isGroup) {
    const other = chat.participants.find(
      p => String(p.userId) !== String(req.user._id)
    );
    otherUserId = other?.userId;
  }

  let isBlockedByOther = false;

  if (otherUserId) {
    isBlockedByOther = await Block.exists({
      blockedBy: otherUserId,
      blockedUser: req.user._id,
      type: "user"
    });
  }

  res.status(200).json(new ApiResponse(200, { ...chat, otherUserBlockedMe: !!isBlockedByOther }, "Chat details fetched"));
});

/* ============================================================
   1️⃣3️⃣ GET GROUP MEMBERS
   ============================================================ */
export const getGroupMembers = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const members = await ChatMember.aggregate([
    { $match: { chatId: new mongoose.Types.ObjectId(chatId) } },
    {
      $lookup: {
        from: "profiles",
        localField: "userId",
        foreignField: "userId",
        as: "p",
      },
    },
    { $unwind: "$p" },

    {
      $project: {
        userId: 1,
        role: 1,
        username: "$p.username",
        avatarUrl: "$p.avatarUrl",
        isOnline: "$p.isOnline",
        lastSeenAt: "$p.lastSeenAt",
        isDeactivated: "$p.isDeactivated"
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, members, "Members fetched"));
});

/* ============================================================
   1️⃣4️⃣ GET CHAT DEVICES
   ============================================================ */
export const getChatDevices = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const member = await ChatMember.findOne({
    chatId,
    userId: req.user._id,
  });
  if (!member) throw new ApiError(403, "Not a member of this chat");

  const members = await ChatMember.find({ chatId });
  const ids = members.map((m) => m.userId);

  const devices = await Device.find({
    userId: { $in: ids },
    status: "active",
  }).select("userId deviceId publicKey -_id");

  res.status(200).json(new ApiResponse(200, devices, "Devices fetched"));
});

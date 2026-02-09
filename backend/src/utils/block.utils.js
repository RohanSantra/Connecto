// src/utils/block.utils.js
import Block from "../models/block.model.js";
import ChatMember from "../models/chatMember.model.js";
import mongoose from "mongoose";

/**
 * loadBlockedSetsForUser(userId)
 * returns sets for quick in-memory checks:
 *  { blockedUsersSet, usersWhoBlockedMeSet, blockedChatsSet }
 */
export async function loadBlockedSetsForUser(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const blocks = await Block.find({
    $or: [
      { blockedBy: uid },            // entities this user blocked
      { blockedUser: uid },          // users that blocked this user
      { blockedChat: { $exists: true }, blockedBy: uid }, // chats this user blocked
    ],
  }).lean();

  const blockedUsersSet = new Set();
  const usersWhoBlockedMeSet = new Set();
  const blockedChatsSet = new Set();

  for (const b of blocks) {
    if (b.type === "user") {
      if (String(b.blockedBy) === String(uid) && b.blockedUser) blockedUsersSet.add(String(b.blockedUser));
      if (String(b.blockedUser) === String(uid) && b.blockedBy) usersWhoBlockedMeSet.add(String(b.blockedBy));
    } else if (b.type === "chat") {
      if (String(b.blockedBy) === String(uid) && b.blockedChat) blockedChatsSet.add(String(b.blockedChat));
    }
  }

  return { blockedUsersSet, usersWhoBlockedMeSet, blockedChatsSet };
}

/**
 * isUserBlockedBetween(a, b)
 * returns true if either a blocked b OR b blocked a.
 */
export async function isUserBlockedBetween(a, b) {
  const aId = new mongoose.Types.ObjectId(a);
  const bId = new mongoose.Types.ObjectId(b);

  const exists = await Block.exists({
    type: "user",
    $or: [
      { blockedBy: aId, blockedUser: bId },
      { blockedBy: bId, blockedUser: aId }
    ]
  });

  return !!exists;
}

/**
 * isChatBlockedForUser(chatId, userId)
 * returns true if user blocked chat (so user should not send/receive).
 */
export async function isChatBlockedForUser(chatId, userId) {
  const chatObj = new mongoose.Types.ObjectId(chatId);
  const userObj = new mongoose.Types.ObjectId(userId);
  const exists = await Block.exists({
    type: "chat",
    blockedBy: userObj,
    blockedChat: chatObj
  });
  return !!exists;
}

/**
 * isUserMemberOfChat(userId, chatId)
 */
export async function isUserMemberOfChat(userId, chatId) {
  const exists = await ChatMember.exists({
    userId: new mongoose.Types.ObjectId(userId),
    chatId: new mongoose.Types.ObjectId(chatId),
  });
  return !!exists;
}

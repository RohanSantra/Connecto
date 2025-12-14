// lib/normalize.js
import { decryptIncomingMessage, decryptIncomingMessageWithReply } from "@/lib/decryption";
import { useMessageStore } from "@/store/useMessageStore";
import { useProfileStore } from "@/store/useProfileStore";

/* ============================================
   Normalize LAST MESSAGE (with decryption)
============================================ */
export function normalizeLastMessage(raw) {

  if (!raw || typeof raw !== "object") {
    return {
      type: "none",
      content: "",
      createdAt: null,
      isDeleted: false,
      attachments: [],
    };
  }

  let msg = { ...raw };

  // ALWAYS use nested decryption
  try {
    msg = decryptIncomingMessageWithReply({ ...msg });
  } catch (e) {
    console.warn("normalize decrypt failed:", e);
  }

  const myId = useProfileStore.getState().profile?.userId;

  /* clear chat filter */
  const clearedAt = useMessageStore.getState().clearedAt?.[msg.chatId];
  if (clearedAt) {
    const created = new Date(msg.createdAt);
    if (created <= new Date(clearedAt)) {
      return {
        type: "none",
        content: "",
        createdAt: null,
        isDeleted: false,
        attachments: [],
      };
    }
  }

  const deletedArr = Array.isArray(msg.deletedFor)
    ? msg.deletedFor.map(String)
    : [];

  const deletedForMe = myId ? deletedArr.includes(String(myId)) : false;
  const isDeleted = !!(msg.deleted || msg.isDeleted);

  if (isDeleted || deletedForMe) {
    return {
      type: "deleted",
      content: deletedForMe ? "You deleted this message" : "Message deleted",
      createdAt: msg.createdAt || null,
      isDeleted: true,
      deletedForMe,
      attachments: [],
    };
  }

  const type = msg.type ||
    (msg.imageUrl ? "image" :
      msg.videoUrl ? "video" :
        msg.audioUrl ? "audio" :
          msg.documentUrl ? "document" :
            "text");

  let content = msg.plaintext || msg.content || "";

  if (!content) {
    if (type === "image") content = "Photo";
    if (type === "video") content = "Video";
    if (type === "audio") content = "Audio";
    if (type === "document") content = "Document";
  }

  return {
    type,
    content,
    createdAt: msg.createdAt || null,
    senderId: msg.senderId || null,
    isDeleted: false,
    reactions: msg.reactions || [],
    deliveredTo: msg.deliveredTo || [],
    readBy: msg.readBy || [],
    attachments: msg.attachments || [],
    _id: msg._id || msg.messageId || null,
  };
}


/* ============================================
   Normalize CHAT
   - always prefer chat.participants (backend)
   - align any profile lookup if chat.profiles exists
============================================ */
export function normalizeChat(chat) {
  if (!chat) return chat;

  const myUserId = useProfileStore.getState().profile?.userId;
  const chatId = chat.chatId || chat._id || (chat._id && String(chat._id));

  // canonical participants array (fallbacks)
  let participants = chat.participants || chat.members || [];

  // If profiles (lookup) present, align them into participants entries
  // so participants[i] contains username/avatar/isOnline etc when possible.
  if (Array.isArray(participants) && Array.isArray(chat.profiles) && chat.profiles.length) {
    // Build map by userId from profiles
    const profMap = new Map();
    chat.profiles.forEach((p) => {
      if (p?.userId) profMap.set(String(p.userId), p);
    });

    participants = participants.map((p) => {
      const uid = p?.userId || p;
      const prof = profMap.get(String(uid));
      if (prof) {
        return {
          // keep role/lastSeenAt/pinned if present on participant record
          ...(typeof p === "object" ? p : { userId: uid }),
          username: (p && p.username) || prof.username || p?.username || null,
          avatarUrl: (p && p.avatarUrl) || prof.avatarUrl || null,
          isOnline: typeof p?.isOnline !== "undefined" ? p.isOnline : prof.isOnline,
          lastSeenAt: p?.lastSeenAt || prof.lastSeen || prof.lastSeenAt || null,
        };
      }
      // no profile lookup, return as is
      return typeof p === "object" ? p : { userId: uid };
    });
  } else {
    // ensure each participant is object with userId
    participants = participants.map((p) => (typeof p === "object" ? p : { userId: p }));
  }

  // identify otherUser for 1:1 chats
  const otherUser =
    !chat.isGroup
      ? participants.find((p) => String(p.userId) !== String(myUserId)) || null
      : null;

  if (otherUser) {
    if (!otherUser.username) otherUser.username = "Unknown";
    if (!otherUser.avatarUrl) otherUser.avatarUrl = null;
  }


  return {
    ...chat,
    chatId,
    participants,
    otherUser,
    lastMessage: chat.lastMessage ? normalizeLastMessage(chat.lastMessage) : null,
    unreadCount: Number(chat.unreadCount) || 0,
  };
}

// src/store/useChatStore.js
import { create } from "zustand";
import { toast } from "sonner";
import api from "@/api/axios";
import { normalizeChat, normalizeLastMessage } from "@/lib/normalize.js";
import { getSocket } from "@/lib/socket";
import { ChatEventEnum } from "@/constants";
import { useProfileStore } from "./useProfileStore";
// NEW: need clearedAt persisted in message store to compute tombstones
import { useMessageStore } from "./useMessageStore";
import { useBlockStore } from "./useBlockStore";

/* ---------------------------------------------
   Utility — dedupe chats by chatId
--------------------------------------------- */
const mergeChats = (list) => {
  const map = new Map();
  list.forEach((c) => {
    const id = String(c.chatId);
    const prev = map.get(id);
    map.set(id, prev ? { ...prev, ...c } : c);
  });
  return [...map.values()];
};


/* ==========================================================
   Helper: apply clearedAt -> if chat.lastMessage is older than
   clearedAt for that chat, hide it (set lastMessage: null)
   This prevents showing deleted/tombstone previews after refresh.
   ========================================================== */
const applyClearedToLastMessage = (chat) => {
  if (!chat) return chat;
  try {
    const clearedAt = useMessageStore.getState().clearedAt?.[chat.chatId];
    if (!clearedAt) return chat;

    const lm = chat.lastMessage;
    if (!lm || !lm.createdAt) return { ...chat, lastMessage: null };

    if (new Date(lm.createdAt) <= new Date(clearedAt)) {
      return { ...chat, lastMessage: null };
    }
  } catch (e) {
    // fail-safe: return chat unchanged
    return chat;
  }
  return chat;
};

/* ---------------------------------------------
   CHAT STORE
--------------------------------------------- */
export const useChatStore = create((set, get) => ({
  chats: [],
  activeChatId: null,
  activeChat: null,
  loading: false,
  loadingChats: true,
  hasFetchedChats: false,
  loadingActiveChat: false,

  typing: {}, // { chatId: { userId: true } }
  activeChatDevices: [],

  /* ==========================================================
     SET ACTIVE CHAT
  ========================================================== */
  setActiveChatId: async (chatId) => {
    const prev = get().activeChatId;

    // leave previous room
    try {
      const socket = getSocket();
      if (prev && socket) {
        socket.emit(ChatEventEnum.LEAVE_CHAT_EVENT, prev);
      }
    } catch { }

    set({
      activeChatId: chatId,
      activeChat: null,
      activeChatDevices: [],
      loadingActiveChat: !!chatId,
    });

    if (!chatId) {
      set({ loadingActiveChat: false });
      return;
    }

    await get().fetchChatDetails(chatId);
    await get().fetchChatDevices(chatId);
    set({ loadingActiveChat: false });

    // join new room
    try {
      const socket = getSocket();
      if (socket) socket.emit(ChatEventEnum.JOIN_CHAT_EVENT, chatId);
    } catch { }

    // reset unread locally
    set({
      chats: get().chats.map((c) =>
        String(c.chatId) === String(chatId) ? { ...c, unreadCount: 0 } : c
      ),
    });

    // sync delivery + read status
    try {
      const active = get().activeChat;
      const lastMsgId =
        active?.lastMessage?._id || active?.lastMessage?.messageId || null;

      // delivered
      if (lastMsgId) {
        await api.patch(
          `/messages/${chatId}/delivered`,
          { messageId: lastMsgId },
          { withCredentials: true }
        );
      } else {
        await api.patch(
          `/messages/${chatId}/delivered`,
          {},
          { withCredentials: true }
        );
      }

      // read
      await api.patch(
        `/messages/${chatId}/read`,
        lastMsgId ? { readUpToId: lastMsgId } : {},
        { withCredentials: true }
      );

      // emit socket read
      const socket = getSocket();
      if (socket) {
        socket.emit(ChatEventEnum.MESSAGE_READ_EVENT, {
          chatId,
          readUpToId: lastMsgId || undefined,
        });
      }
    } catch (err) {
      console.warn("mark chat delivered/read failed:", err);
    }
  },

  /* ==========================================================
     FETCH ALL CHATS
  ========================================================== */
  fetchChats: async () => {
    set({ loadingChats: true });

    try {
      const res = await api.get("/chats", { withCredentials: true });
      const raw = res.data?.data || [];

      const normalized = raw.map((c) => normalizeChat(c));

      const blockStore = useBlockStore.getState();
      const withBlockState = normalized.map(chat => {
        const existing = get().chats.find(c => String(c.chatId) === String(chat.chatId));

        const userBlocked = !chat.isGroup && blockStore.isUserBlocked(chat.otherUser?.userId);
        const chatBlocked = chat.isGroup && blockStore.isChatBlocked(chat.chatId);

        const hide = userBlocked || chatBlocked;

        return {
          ...chat,

          // 🔴 BLOCK FLAGS (PERSISTED)
          iBlockedOtherUser: existing?.iBlockedOtherUser ?? userBlocked,
          chatBlockedByMe: existing?.chatBlockedByMe ?? chatBlocked,
          otherUserBlockedMe: existing?.otherUserBlockedMe ?? chat.otherUserBlockedMe ?? false,

          // 🔴 PREVIEW WIPE IF BLOCKED
          lastMessage: hide ? null : chat.lastMessage,
          unreadCount: hide ? 0 : chat.unreadCount,
        };
      });

      // apply clearedAt to each chat so lastMessage won't show
      const normalizedWithClear = normalized.map((ch) => applyClearedToLastMessage(ch));

      set({ chats: mergeChats(withBlockState) });
      return normalizedWithClear;
    } catch (err) {
      // throw err;
      return [];
    } finally {
      set({
        loadingChats: false,
        hasFetchedChats: true,
      });
    }
  },

  /* ==========================================================
     FETCH CHAT DETAILS
  ========================================================== */
  fetchChatDetails: async (chatId) => {
    if (!chatId) return null;

    try {
      const res = await api.get(`/chats/${chatId}`, { withCredentials: true });
      const chat = normalizeChat(res.data?.data);
      const blockedFlag = res.data.data.otherUserBlockedMe || false;
      set({
        activeChat: {
          ...applyClearedToLastMessage(chat),
          otherUserBlockedMe: blockedFlag
        }
      });

      set(state => ({
        chats: state.chats.map(c =>
          String(c.chatId) === String(chatId)
            ? { ...c, otherUserBlockedMe: blockedFlag }
            : c
        )
      }));
      return chat;
    } catch (err) {

      // 🔥 If chat deleted/left — DO NOT show error
      if (err.response?.status === 403 || err.response?.status === 404) {
        set({ activeChat: null, activeChatId: null });
        return null;
      }

      toast.error("Failed to load chat");
      return null;
    }
  },


  /* ==========================================================
     FETCH DEVICES (E2EE)
  ========================================================== */
  fetchChatDevices: async (chatId) => {
    try {
      const res = await api.get(`/chats/${chatId}/devices`, {
        withCredentials: true,
      });
      const devices = res.data?.data || [];
      set({ activeChatDevices: devices });

      return devices;
    } catch {
      return [];
    }
  },

  /* ==========================================================
     CREATE ONE-TO-ONE CHAT
  ========================================================== */
  createOneToOneChat: async (participantId) => {
    try {
      const res = await api.post(
        "/chats/one-to-one",
        { participantId },
        { withCredentials: true }
      );

      const chat = normalizeChat(res.data?.data);
      return chat; // socket will insert
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create chat";
      throw new Error(msg);
    }
  },

  /* ==========================================================
     CREATE GROUP CHAT
  ========================================================== */
  createGroupChat: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post("/chats/group", payload, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const chat = normalizeChat(res.data?.data);
      return chat;
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create group";
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  /* ==========================================================
     RENAME GROUP
  ========================================================== */
  renameGroup: async (chatId, data) => {
    try {
      const res = await api.patch(`/chats/group/${chatId}`, data, {
        withCredentials: true,
      });

      const updated = normalizeChat(res.data?.data);

      set({
        chats: get().chats.map((c) =>
          c.chatId === chatId ? updated : c
        ),
      });

      if (get().activeChatId === chatId) {
        set({ activeChat: updated });
      }
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to rename group";
      throw new Error(msg);
    }
  },

  /* ==========================================================
     UPDATE GROUP AVATAR
  ========================================================== */
  updateGroupAvatar: async (chatId, formData) => {
    try {
      const res = await api.patch(
        `/chats/group/${chatId}/avatar`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      const updated = normalizeChat(res.data?.data);

      set({
        chats: get().chats.map((c) =>
          c.chatId === chatId ? updated : c
        ),
      });

      if (get().activeChatId === chatId) {
        set({ activeChat: updated });
      }
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update group avatar";
      throw new Error(msg);
      return null;
    }
  },

  /* ==========================================================
     DELETE CHAT
  ========================================================== */
  deleteChat: async (chatId) => {
    try {
      await api.delete(`/chats/${chatId}`, { withCredentials: true });

      set({
        chats: get().chats.filter((c) => c.chatId !== chatId),
      });

      if (get().activeChatId === chatId) {
        set({ activeChatId: null, activeChat: null });
      }

    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete chat";
      throw new Error(msg);
    }
  },

  /* ==========================================================
     PIN / UNPIN CHAT
  ========================================================== */
  togglePin: async (chatId) => {
    const state = get();
    const chat = state.chats.find(c => c.chatId === chatId);
    if (!chat) return;

    const newPinned = !chat.pinned; // ✅ derive from state, not param

    // optimistic update
    set({
      chats: state.chats.map(c =>
        c.chatId === chatId ? { ...c, pinned: newPinned } : c
      )
    });

    try {
      if (newPinned) {
        await api.put(`/chats/${chatId}/pin`, {}, { withCredentials: true });
      } else {
        await api.put(`/chats/${chatId}/unpin`, {}, { withCredentials: true });
      }

      // reorder AFTER success
      set(state => {
        const updated = state.chats.map(c =>
          c.chatId === chatId ? { ...c, pinned: newPinned } : c
        );

        updated.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

        return { chats: updated };
      });

      return newPinned;


    } catch (err) {
      // rollback
      set({
        chats: get().chats.map(c =>
          c.chatId === chatId ? { ...c, pinned: !newPinned } : c
        )
      });

      const msg = err?.response?.data?.message || "Failed to toggle chat";
      throw new Error(msg);
    }
  },


  /* ==========================================================
     ADD MEMBER (correct route)
  ========================================================== */
  addMember: async (chatId, userId) => {
    try {
      const res = await api.post(
        `/chats/group/${chatId}/members`,
        { userId },
        { withCredentials: true }
      );

      const updated = normalizeChat(res.data.data);
      get().updateGroupInfoSocket(updated); // refresh UI
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to add new member";
      throw new Error(msg);
    }
  },

  /* ==========================================================
     REMOVE MEMBER (correct route)
  ========================================================== */
  removeMember: async (chatId, userId) => {
    try {
      const res = await api.delete(
        `/chats/group/${chatId}/members/${userId}`,
        { withCredentials: true }
      );

      const updated = normalizeChat(res.data.data);
      get().updateGroupInfoSocket(updated);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to remove member";
      throw new Error(msg);
    }
  },

  /* ==========================================================
     PROMOTE MEMBER
  ========================================================== */
  promoteMember: async (chatId, userId) => {
    try {
      const res = await api.post(
        `/chats/group/${chatId}/members/promote`,
        { userId },
        { withCredentials: true }
      );

      const updated = normalizeChat(res.data.data);
      get().updateGroupInfoSocket(updated);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to promote member";
      throw new Error(msg);
    }
  },

  /* ==========================================================
     DEMOTE MEMBER
  ========================================================== */
  demoteMember: async (chatId, userId) => {
    try {
      const res = await api.post(
        `/chats/group/${chatId}/members/demote`,
        { userId },
        { withCredentials: true }
      );

      const updated = normalizeChat(res.data.data);
      get().updateGroupInfoSocket(updated);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to demote admin";
      throw new Error(msg);
    }
  },

  /* ==========================================================
     LEAVE GROUP (self remove)
  ========================================================== */
  leaveGroup: async (chatId) => {
    try {
      const myId = useProfileStore.getState().profile.userId;

      await api.delete(`/chats/group/${chatId}/members/${myId}`, {
        withCredentials: true
      });

      // 🔥 REMOVE CHAT LOCALLY (THIS IS THE FIX)
      set(state => ({
        chats: state.chats.filter(c => c.chatId !== chatId),
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        activeChat: state.activeChatId === chatId ? null : state.activeChat
      }));

    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to leave group";
      throw new Error(msg);
    }
  },



  /* ==========================================================
     SOCKET — GROUP RENAMED
  ========================================================== */
  updateGroupInfoSocket: (payload) => {
    const chat = payload.chat || payload;
    const norm = applyClearedToLastMessage(normalizeChat(chat));

    set({
      chats: get().chats.map((c) =>
        c.chatId === norm.chatId
          ? {
            ...c,               // keep pinned, unreadCount, local UI state
            ...norm,            // update server fields (name, avatar, etc)
          }
          : c
      ),
    });

    if (get().activeChatId === norm.chatId) {
      set({ activeChat: norm });
    }
  },

  /* ==========================================================
     SOCKET — GROUP AVATAR UPDATED
  ========================================================== */
  updateGroupAvatarSocket: (payload) => {
    const chat = payload.chat || payload;
    const norm = applyClearedToLastMessage(normalizeChat(chat));

    set({
      chats: get().chats.map((c) =>
        c.chatId === norm.chatId
          ? {
            ...c,               // keep pinned, unreadCount, local UI state
            ...norm,            // update server fields (name, avatar, etc)
          }
          : c
      ),
    });

    if (get().activeChatId === norm.chatId) {
      set({ activeChat: norm });
    }
  },

  /* ==========================================================
     SOCKET — NEW CHAT ADDED
  ========================================================== */
  createOrAddChatSocket: (chat) => {
    if (!chat) return;

    const norm = applyClearedToLastMessage(normalizeChat(chat));

    set((state) => {
      const exists = state.chats.some(
        (c) => String(c.chatId) === String(norm.chatId)
      );

      if (exists) {
        return {
          chats: state.chats.map((c) =>
            String(c.chatId) === String(norm.chatId) ? norm : c
          ),
        };
      }

      return { chats: [norm, ...state.chats] };
    });

    if (get().activeChatId === norm.chatId) {
      set({ activeChat: norm });
    }
  },

  /* ==========================================================
     SOCKET — PIN/UNPIN
  ========================================================== */
  updateChatPinnedSocket: ({ chatId, pinned }) => {
    set(state => {
      const updated = state.chats.map(c =>
        c.chatId === chatId ? { ...c, pinned } : c
      );

      updated.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

      return { chats: updated };
    });
  },

  /* ==========================================================
     SOCKET — CHAT DELETED
  ========================================================== */
  deleteChatSocket: ({ chatId }) => {
    if (!chatId) return;

    set({
      chats: get().chats.filter((c) => c.chatId !== chatId),
    });

    if (get().activeChatId === chatId) {
      set({ activeChatId: null, activeChat: null });
    }
  },

  /* ==========================================================
     SOCKET — MEMBER ADDED
  ========================================================== */
  groupMemberAddedSocket: (payload) => {
    const chat = payload.chat || payload;
    const norm = applyClearedToLastMessage(normalizeChat(chat));
    set({
      chats: get().chats.map((c) =>
        c.chatId === norm.chatId ? norm : c
      ),
      activeChat: get().activeChatId === norm.chatId ? norm : get().activeChat
    });
  },




  /* ==========================================================
     SOCKET — MEMBER REMOVED
  ========================================================== */
  groupMemberRemovedSocket: (payload) => {
    const chat = payload.chat || payload;
    const norm = applyClearedToLastMessage(normalizeChat(chat));
    set({
      chats: get().chats.map((c) =>
        c.chatId === norm.chatId ? norm : c
      ),
      activeChat: get().activeChatId === norm.chatId ? norm : get().activeChat
    });
  },

  /* ==========================================================
     SOCKET — TYPING
  ========================================================== */
  setTyping: (chatId, userId, isTyping) => {
    const typing = { ...get().typing };
    if (!typing[chatId]) typing[chatId] = {};

    if (isTyping) typing[chatId][userId] = true;
    else delete typing[chatId][userId];

    set({ typing });
  },

  /* ==========================================================
     INCREMENT UNREAD
  ========================================================== */
  incrementUnread: (chatId, lastMessage, serverUnread) => {
    const me = String(useProfileStore.getState().profile?.userId || "");

    // ignore own message
    if (lastMessage?.senderId && String(lastMessage.senderId) === me) return;

    // ignore if chat open
    if (String(get().activeChatId) === String(chatId)) return;

    set({
      chats: get().chats.map((c) =>
        c.chatId === chatId
          ? {
            ...c,
            unreadCount:
              typeof serverUnread === "number"
                ? serverUnread
                : (c.unreadCount || 0) + 1,
            lastMessage:
              lastMessage ? normalizeLastMessage(lastMessage) : c.lastMessage,
          }
          : c
      ),
    });
  },

  /* ==========================================================
     SOCKET — MESSAGE DELIVERY/READ
  ========================================================== */
  updateLastMessageStatusSocket: ({
    chatId,
    messageId,
    deliveredTo,
    readBy,
    readUpToId,
    readAt,
  }) => {
    const state = get();
    const me = String(useProfileStore.getState().profile?.userId || "");

    // Merge delivered/read arrays
    const merge = (oldArr = [], incoming = []) => {
      const map = new Map();
      oldArr.forEach((x) => map.set(String(x.userId), x));
      incoming.forEach((x) => map.set(String(x.userId), x));
      map.delete(me); // remove my own read/delivered
      return [...map.values()];
    };

    // Update chats list
    set({
      chats: state.chats.map((c) => {
        if (String(c.chatId) !== String(chatId)) return c;

        const old = c.lastMessage || {};
        const updated = { ...old };

        if (deliveredTo) updated.deliveredTo = merge(old.deliveredTo, deliveredTo);
        if (readBy) updated.readBy = merge(old.readBy, readBy);

        return { ...c, lastMessage: updated };
      }),
    });

    // Update active chat
    const ac = state.activeChat;
    if (String(state.activeChatId) === String(chatId) && ac?.lastMessage) {
      set({
        activeChat: {
          ...ac,
          lastMessage: {
            ...ac.lastMessage,
            deliveredTo: merge(ac.lastMessage.deliveredTo, deliveredTo),
            readBy: merge(ac.lastMessage.readBy, readBy),
          },
        },
      });

      // clear unread
      if (String(me) === String(readBy?.userId)) {
        set({
          chats: get().chats.map((c) =>
            c.chatId === chatId ? { ...c, unreadCount: 0 } : c
          ),
        });
      }
    }
  },

  /* ==========================================================
     SET USER ONLINE STATUS
  ========================================================== */
  setUserOnlineStatus: (userId, isOnline, lastSeenAt) => {
    const chats = get().chats.map((c) => {

      // update participants
      const updatedParticipants = c.participants?.map((p) =>
        String(p.userId) === String(userId)
          ? { ...p, isOnline, lastSeenAt }
          : p
      );

      // update otherUser if exists
      let updatedOtherUser = c.otherUser;
      if (c.otherUser && String(c.otherUser.userId) === String(userId)) {
        updatedOtherUser = {
          ...c.otherUser,
          isOnline,
          lastSeenAt,
        };
      }

      return {
        ...c,
        participants: updatedParticipants,
        otherUser: updatedOtherUser,
      };
    });

    let ac = get().activeChat;
    if (ac?.participants) {
      const updatedParticipants = ac.participants.map((p) =>
        String(p.userId) === String(userId)
          ? { ...p, isOnline, lastSeenAt }
          : p
      );

      let updatedOtherUser = ac.otherUser;
      if (ac.otherUser && String(ac.otherUser.userId) === String(userId)) {
        updatedOtherUser = {
          ...ac.otherUser,
          isOnline,
          lastSeenAt,
        };
      }

      ac = {
        ...ac,
        participants: updatedParticipants,
        otherUser: updatedOtherUser,
      };
    }

    set({ chats, activeChat: ac });
  },

  deleteMessageLastUpdateSocket({ chatId, message, actorId, forEveryone }) {
    set((state) => {
      const currentUserId = useProfileStore.getState().profile?.userId;

      const chats = state.chats.map((c) => {
        if (String(c.chatId) !== String(chatId)) return c;

        const last = c.lastMessage;
        if (!last || String(last._id) !== String(message._id)) return c;

        if (forEveryone) {
          return {
            ...c,
            lastMessage: {
              ...last,
              deleted: true,
              content: "Message deleted",
              plaintext: "",
              attachments: [],
            },
          };
        }

        // delete-for-me — only update preview text if THIS user is the actor
        const deletedForArr = Array.isArray(last.deletedFor)
          ? last.deletedFor.map(String)
          : [];

        const nextDeletedFor = Array.from(
          new Set([...deletedForArr, String(actorId)])
        );

        return {
          ...c,
          lastMessage: {
            ...last,
            deletedFor: nextDeletedFor,
            content:
              String(actorId) === String(currentUserId)
                ? "You deleted this message"
                : last.content,
          },
        };
      });

      // update activeChat preview too
      let activeChat = state.activeChat;
      if (
        activeChat &&
        String(activeChat.chatId) === String(chatId) &&
        activeChat.lastMessage &&
        String(activeChat.lastMessage._id) === String(message._id)
      ) {
        if (forEveryone) {
          activeChat = {
            ...activeChat,
            lastMessage: {
              ...activeChat.lastMessage,
              deleted: true,
              content: "Message deleted",
              plaintext: "",
              attachments: [],
            },
          };
        } else {
          const deletedForArr = Array.isArray(activeChat.lastMessage.deletedFor)
            ? activeChat.lastMessage.deletedFor.map(String)
            : [];

          const nextDeletedFor = Array.from(
            new Set([...deletedForArr, String(actorId)])
          );

          activeChat = {
            ...activeChat,
            lastMessage: {
              ...activeChat.lastMessage,
              deletedFor: nextDeletedFor,
              content:
                String(actorId) === String(currentUserId)
                  ? "You deleted this message"
                  : activeChat.lastMessage.content,
            },
          };
        }
      }

      return { chats, activeChat };
    });
  },

  onChatClearedSocket: ({ chatId, userId }) => {
    const me = String(useProfileStore.getState().profile?.userId);

    // Only apply UI wipe if *I* cleared the chat
    if (String(userId) !== me) return;

    set((state) => ({
      chats: state.chats.map(c =>
        String(c.chatId) === String(chatId)
          ? {
            ...c,
            lastMessage: null,
            unreadCount: 0,
          }
          : c
      ),
    }));

    // also reset activeChat preview
    if (String(get().activeChatId) === String(chatId)) {
      set({
        activeChat: {
          ...get().activeChat,
          lastMessage: null,
        },
      });
    }
  },

  markUserDeactivatedInChats: (userId) => {
    const id = String(userId);

    set((state) => ({
      chats: state.chats.map((chat) => ({
        ...chat,
        participants: chat.participants?.map((m) =>
          String(m.userId) === id
            ? { ...m, isDeactivated: true, isOnline: false }
            : m
        ),
        otherUser:
          chat.otherUser && String(chat.otherUser.userId) === id
            ? { ...chat.otherUser, isDeactivated: true, isOnline: false }
            : chat.otherUser,
      })),
    }));
  },

  markUserReactivatedInChats: (userId) => {
    const id = String(userId);

    set((state) => ({
      chats: state.chats.map((chat) => ({
        ...chat,
        participants: chat.participants?.map((m) =>
          String(m.userId) === id
            ? { ...m, isDeactivated: false }
            : m
        ),
        otherUser:
          chat.otherUser && String(chat.otherUser.userId) === id
            ? { ...chat.otherUser, isDeactivated: false }
            : chat.otherUser,
      })),
    }));
  },

  markUserAsBlockedByOther: (blockerId) => {
    const id = String(blockerId);

    set((state) => ({
      chats: state.chats.map((chat) => {
        // Only affects 1:1 chats
        if (chat.isGroup) return chat;

        if (String(chat.otherUser?.userId) === id) {
          return {
            ...chat,
            otherUserBlockedMe: true,
            lastMessage: null,
            unreadCount: 0,
          };
        }
        return chat;
      }),
      activeChat:
        state.activeChat &&
          !state.activeChat.isGroup &&
          String(state.activeChat.otherUser?.userId) === id
          ? {
            ...state.activeChat,
            otherUserBlockedMe: true,
            lastMessage: null,
          }
          : state.activeChat,
    }));
  },

  markUserAsUnblockedByOther: (blockerId) => {
    const id = String(blockerId);

    set((state) => ({
      chats: state.chats.map((chat) => {
        if (chat.isGroup) return chat;

        if (String(chat.otherUser?.userId) === id) {
          return {
            ...chat,
            otherUserBlockedMe: false,
          };
        }
        return chat;
      }),
      activeChat:
        state.activeChat &&
          !state.activeChat.isGroup &&
          String(state.activeChat.otherUser?.userId) === id
          ? {
            ...state.activeChat,
            otherUserBlockedMe: false,
          }
          : state.activeChat,
    }));
  },



}));

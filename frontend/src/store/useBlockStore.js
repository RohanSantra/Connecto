import { create } from "zustand";
import api from "@/api/axios";
import { useChatStore } from "./useChatStore";

export const useBlockStore = create((set, get) => ({
  blockedUsers: [],   // [{ type, blockedAt, user: {...} }]
  blockedChats: [],   // [{ type, blockedAt, chat: {...} }]
  loading: false,
  error: null,

  /* ================= FETCH BLOCKS ================= */
  fetchBlocks: async () => {
    try {
      set({ loading: true, error: null });

      const res = await api.get("/blocks");
      const data = res.data?.data || {};

      set({
        blockedUsers: data.users || [],
        blockedChats: data.chats || [],
        loading: false,
      });
    } catch (err) {
      set({
        error: err?.response?.data?.message || "Failed to fetch blocks",
        loading: false,
      });
    }
  },

  /* ================= BLOCK USER ================= */
  blockUser: async (userId) => {
    try {
      const res = await api.post(`/blocks/users/${userId}`);
      const block = res.data?.data;

      if (!block) return;

      // refetch for enriched profile data
      await get().fetchBlocks();
    } catch (err) {
      set({ error: err?.response?.data?.message || "Block failed" });
    }
  },

  /* ================= UNBLOCK USER ================= */
  unblockUser: async (userId) => {
    try {
      await api.delete(`/blocks/users/${userId}`);
      set((state) => ({
        blockedUsers: state.blockedUsers.filter(
          (b) => String(b.user.userId) !== String(userId)
        ),
      }));
    } catch (err) {
      set({ error: err?.response?.data?.message || "Unblock failed" });
    }
  },

  /* ================= BLOCK CHAT ================= */
  blockChat: async (chatId) => {
    try {
      await api.post(`/blocks/chats/${chatId}`);
      await get().fetchBlocks(); // refresh to get chat details
    } catch (err) {
      set({ error: err?.response?.data?.message || "Block chat failed" });
    }
  },

  /* ================= UNBLOCK CHAT ================= */
  unblockChat: async (chatId) => {
    try {
      await api.delete(`/blocks/chats/${chatId}`);
      set((state) => ({
        blockedChats: state.blockedChats.filter(
          (b) => String(b.chat.chatId) !== String(chatId)
        ),
      }));
    } catch (err) {
      set({ error: err?.response?.data?.message || "Unblock chat failed" });
    }
  },

  /* ================= SOCKET SYNC ================= */
  onBlockListUpdatedSocket: async () => {
    await get().fetchBlocks();
  },

  /* ==========================================================
   SYNC BLOCK STATE INTO CHAT LIST (🔥 MAIN FIX)
========================================================== */
  syncBlockedStateToChats: (blockedUsers, blockedChats) => {
    const blockedUserIds = new Set(
      blockedUsers.map((b) => String(b.user.userId))
    );

    const blockedChatIds = new Set(
      blockedChats.map((b) => String(b.chat.chatId))
    );

    useChatStore.setState((state) => ({
      chats: state.chats.map((c) => {
        const isGroup = c.isGroup;
        const otherId = String(c.otherUser?.userId);

        const userBlocked = !isGroup && blockedUserIds.has(otherId);
        const chatBlocked = isGroup && blockedChatIds.has(String(c.chatId));

        const hide = userBlocked || chatBlocked;

        return {
          ...c,
          iBlockedOtherUser: userBlocked,
          chatBlockedByMe: chatBlocked,
          lastMessage: hide ? null : c.lastMessage,
          unreadCount: hide ? 0 : c.unreadCount,
        };
      }),
    }));
  },


  /* ================= HELPERS ================= */

  isUserBlocked: (userId) =>
    get().blockedUsers.some(
      (b) => String(b.user.userId) === String(userId)
    ),

  isChatBlocked: (chatId) =>
    get().blockedChats.some(
      (b) => String(b.chat.chatId) === String(chatId)
    ),

  canSendToUser: (userId) =>
    !get().blockedUsers.some(
      (b) => String(b.user.userId) === String(userId)
    ),

  canSendToChat: (chatId) =>
    !get().blockedChats.some(
      (b) => String(b.chat.chatId) === String(chatId)
    ),
}));

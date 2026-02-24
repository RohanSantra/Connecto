// src/store/useAdminStore.js
import { create } from "zustand";
import api from "@/api/axios";
import { useProfileStore } from "@/store/useProfileStore";
import { toast } from "sonner";

const ALLOWED_PARAMS = new Set([
  "from",
  "to",
  "limit",
  "includeProfile",
  "chatId",
  "type",
  "includeMembers",
]);

function sanitizeParams(params = {}) {
  if (!params || typeof params !== "object") return {};
  const out = {};
  Object.keys(params).forEach((k) => {
    if (ALLOWED_PARAMS.has(k) && params[k] !== undefined && params[k] !== null) {
      out[k] = params[k];
    }
  });
  return out;
}

export const useAdminStore = create((set, get) => ({
  /* ================= STATE ================= */

  globalStats: null,
  chatStats: {},
  userStats: {},
  callStats: null,
  mediaStats: null,
  activityTimeline: null,
  topEntities: null,

  loading: {
    overview: false,
    calls: false,
    media: false,
    topEntities: false,
    activity: false,
    users: false,
  },

  error: null,

  /* ================= HELPERS ================= */

  setError: (err) => set({ error: err }),

  /* ================= FETCH METHODS ================= */

  fetchGlobalStats: async (params = {}) => {
    set((s) => ({
      loading: { ...s.loading, overview: true },
      error: null,
    }));

    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/global", { params: q });

      set((s) => ({
        globalStats: res.data.data,
        loading: { ...s.loading, overview: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, overview: false },
      }));
      throw err;
    }
  },

  fetchChatStats: async (chatId, params = {}) => {
    if (!chatId) throw new Error("chatId required");

    set((s) => ({
      loading: { ...s.loading, users: true },
      error: null,
    }));

    try {
      const q = sanitizeParams(params);
      const res = await api.get(`/admin/stats/chat/${chatId}`, { params: q });

      set((s) => ({
        chatStats: { ...s.chatStats, [chatId]: res.data.data },
        loading: { ...s.loading, users: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, users: false },
      }));
      throw err;
    }
  },

  fetchUserStats: async (userId, params = {}) => {
    if (!userId) throw new Error("userId required");

    set((s) => ({
      loading: { ...s.loading, users: true },
      error: null,
    }));

    try {
      const q = sanitizeParams(params);
      const res = await api.get(`/admin/stats/user/${userId}`, { params: q });

      set((s) => ({
        userStats: { ...s.userStats, [userId]: res.data.data },
        loading: { ...s.loading, users: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, users: false },
      }));
      throw err;
    }
  },

  fetchCallStats: async (params = {}) => {
    set((s) => ({
      loading: { ...s.loading, calls: true },
      error: null,
    }));

    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/calls", { params: q });

      set((s) => ({
        callStats: res.data.data,
        loading: { ...s.loading, calls: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, calls: false },
      }));
      throw err;
    }
  },

  fetchMediaStats: async (params = {}) => {
    set((s) => ({
      loading: { ...s.loading, media: true },
      error: null,
    }));

    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/media", { params: q });

      set((s) => ({
        mediaStats: res.data.data,
        loading: { ...s.loading, media: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, media: false },
      }));
      throw err;
    }
  },

  fetchActivityTimeline: async (params = {}) => {
    set((s) => ({
      loading: { ...s.loading, activity: true },
      error: null,
    }));

    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/activity", { params: q });

      set((s) => ({
        activityTimeline: res.data.data,
        loading: { ...s.loading, activity: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, activity: false },
      }));
      throw err;
    }
  },

  fetchTopEntities: async (type = "chats", params = {}) => {
    const loadingKey = type === "users" ? "users" : "topEntities";

    set((s) => ({
      loading: { ...s.loading, [loadingKey]: true },
      error: null,
    }));

    try {
      const q = { ...sanitizeParams(params), type };
      const res = await api.get("/admin/stats/top", { params: q });

      set((s) => ({
        topEntities: res.data.data,
        loading: { ...s.loading, [loadingKey]: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, [loadingKey]: false },
      }));
      throw err;
    }
  },

  /* ================= ADMIN ACTIONS ================= */

  // promote/demote
  promoteUser: async (userId) => {
    if (!userId) throw new Error("userId required");
    set({ error: null });
    try {
      const res = await api.post(`/admin/users/${userId}/promote`);
      // update local profile store if helper exists
      useProfileStore.getState()?.setUserAdminStatus?.(userId, true);
      toast.success("User Promoted")
      return res.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message
      });
      toast.error(err?.response?.data?.message || err.message,)
      throw err;
    }
  },

  demoteUser: async (userId) => {
    if (!userId) throw new Error("userId required");
    set({ error: null });
    try {
      const res = await api.post(`/admin/users/${userId}/demote`);
      useProfileStore.getState()?.setUserAdminStatus?.(userId, false);
      toast.success("User Demoted")
      return res.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message
      });
      toast.error(err?.response?.data?.message || err.message,)
      throw err;
    }
  },

  exportUserSummary: async (userId, params = {}) => {
    if (!userId) throw new Error("userId required");

    set((s) => ({
      loading: { ...s.loading, users: true },
      error: null,
    }));

    try {
      const q = sanitizeParams(params);
      const res = await api.get(`/admin/users/${userId}/export`, {
        params: q,
      });

      set((s) => ({
        loading: { ...s.loading, users: false },
      }));

      return res.data.data;
    } catch (err) {
      set((s) => ({
        error: err?.response?.data?.message || err.message,
        loading: { ...s.loading, users: false },
      }));

      throw err;
    }
  },
}));

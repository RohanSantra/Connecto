// src/store/useAdminStore.js
import { create } from "zustand";
import api from "@/api/axios";
import { useProfileStore } from "@/store/useProfileStore";
import { toast } from "sonner";

/**
 * Admin / analytics store
 *
 * IMPORTANT: Server now expects only range-style params (from, to) and a
 * small set of safe filters. This store sanitizes params before sending to
 * the API to avoid sending `period/unit` or other unsupported keys.
 *
 * Supported query keys we pass through:
 * - from (ISO yyyy-mm-dd or full ISO)
 * - to   (ISO yyyy-mm-dd or full ISO)
 * - limit (number)
 * - includeProfile (boolean/string)
 * - chatId (string)
 * - type (string, e.g., "users"|"chats")
 * - includeMembers (boolean/string)
 *
 * All methods accept a params object but the store will strip unknown keys.
 */

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
  // state
  globalStats: null,
  chatStats: {},
  userStats: {},
  callStats: null,
  mediaStats: null,
  activityTimeline: null,
  topEntities: null,

  loading: false,
  error: null,

  // internal helpers
  setLoading: (v) => set({ loading: v }),
  setError: (err) => set({ error: err }),

  // actions
  fetchGlobalStats: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/global", { params: q });
      set({ globalStats: res.data.data, loading: false });
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  fetchChatStats: async (chatId, params = {}) => {
    if (!chatId) throw new Error("chatId required");
    set({ loading: true, error: null });
    try {
      const q = sanitizeParams(params);
      const res = await api.get(`/admin/stats/chat/${chatId}`, { params: q });
      set((s) => ({
        chatStats: { ...s.chatStats, [chatId]: res.data.data },
        loading: false,
      }));
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  fetchUserStats: async (userId, params = {}) => {
    if (!userId) throw new Error("userId required");
    set({ loading: true, error: null });
    try {
      const q = sanitizeParams(params);
      const res = await api.get(`/admin/stats/user/${userId}`, { params: q });
      set((s) => ({
        userStats: { ...s.userStats, [userId]: res.data.data },
        loading: false,
      }));
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  fetchCallStats: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/calls", { params: q });
      set({ callStats: res.data.data, loading: false });
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  fetchMediaStats: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/media", { params: q });
      set({ mediaStats: res.data.data, loading: false });
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  fetchActivityTimeline: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const q = sanitizeParams(params);
      const res = await api.get("/admin/stats/activity", { params: q });
      set({ activityTimeline: res.data.data, loading: false });
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  fetchTopEntities: async (type = "chats", params = {}) => {
    set({ loading: true, error: null });
    try {
      // ensure type is passed explicitly (server expects type param)
      const q = { ...sanitizeParams(params), type };
      const res = await api.get("/admin/stats/top", { params: q });
      set({ topEntities: res.data.data, loading: false });
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },

  // promote/demote
  promoteUser: async (userId) => {
    if (!userId) throw new Error("userId required");
    set({ loading: true, error: null });
    try {
      const res = await api.post(`/admin/users/${userId}/promote`);
      // update local profile store if helper exists
      useProfileStore.getState()?.setUserAdminStatus?.(userId, true);
      set({ loading: false });
      toast.success("User Promoted")
      return res.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      toast.error(err?.response?.data?.message || err.message,)
      throw err;
    }
  },

  demoteUser: async (userId) => {
    if (!userId) throw new Error("userId required");
    set({ loading: true, error: null });
    try {
      const res = await api.post(`/admin/users/${userId}/demote`);
      useProfileStore.getState()?.setUserAdminStatus?.(userId, false);
      set({ loading: false });
      toast.success("User Demoted")
      return res.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      toast.error(err?.response?.data?.message || err.message,)
      throw err;
    }
  },

  exportUserSummary: async (userId, params = {}) => {
    if (!userId) throw new Error("userId required");
    set({ loading: true, error: null });
    try {
      const q = sanitizeParams(params);
      const res = await api.get(`/admin/users/${userId}/export`, { params: q });
      set({ loading: false });
      return res.data.data;
    } catch (err) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      throw err;
    }
  },
}));

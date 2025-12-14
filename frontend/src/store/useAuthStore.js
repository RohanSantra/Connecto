// src/store/useAuthStore.js
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import api from "@/api/axios";
import { toast } from "sonner";

import {
  initSocket,
  disconnectSocket,
  getSocket,
} from "@/lib/socket.js";

import { attachSocketHandlers, detachSocketHandlers } from "@/lib/socketHandlers.js";

import { useMessageStore } from "./useMessageStore";
import { useChatStore } from "./useChatStore";
import { useProfileStore } from "./useProfileStore";
import { useDeviceStore } from "./useDeviceStore";
import { useCallStore } from "./useCallStore";
import { getOrCreateDeviceKeypair } from "@/lib/deviceKeys";
import { ChatEventEnum } from "@/constants.js";

/* ==========================================================
   DEVICE ID
   ========================================================== */
const DEVICE_ID_KEY = "connecto_device_id";
const EMAIL_CACHE_KEY = "connecto_last_email";

function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return uuidv4();
  }
}

/* ==========================================================
   AUTH STORE
   ========================================================== */
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  deviceId: getOrCreateDeviceId(),

  // holds detach function returned by attachSocketHandlers
  socketDetach: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  /* ==========================================================
     Helper: attach socket handlers once (store detach fn)
     ========================================================== */
  ensureAttachSocket: () => {
    try {
      const sock = getSocket();
      if (!sock) return;
      // already attached?
      if (get().socketDetach) return;
      const detach = attachSocketHandlers(sock);
      set({ socketDetach: detach });
    } catch (err) {
      console.warn("ensureAttachSocket failed", err);
    }
  },

  /* ==========================================================
     VERIFY OTP → LOGIN
     (calls initSocket and attaches handlers)
     ========================================================== */
  verifyOtp: async ({ email, otp }) => {
    try {
      const { deviceId } = get();
      const { publicKeyBase64 } = getOrCreateDeviceKeypair();

      const res = await api.post(
        "/auth/verify-otp",
        {
          email,
          otp,
          deviceId,
          deviceName: navigator.userAgent,
          publicKey: publicKeyBase64,
        },
        { withCredentials: true }
      );

      const { user, accessToken } = res.data?.data;
      if (!user) throw new Error("Invalid login response");

      set({ user, isAuthenticated: true });

      // init socket (will attempt connect) and attach handlers
      initSocket({ accessToken, userId: user._id, deviceId });
      get().ensureAttachSocket();

      // cache last email for UX
      try {
        localStorage.setItem(EMAIL_CACHE_KEY, email);
      } catch {}

      toast.success("OTP Verified");
      return { success: true };
    } catch (err) {
      toast.error(err?.response?.data?.message || "OTP verification failed");
      return { success: false };
    }
  },

  /* ==========================================================
     CHECK AUTH ON PAGE LOAD
     ========================================================== */
  checkAuth: async () => {
    set({ loading: true });

    try {
      const res = await api.get("/auth/check", { withCredentials: true });
      const user = res.data?.data;

      if (!user) {
        // detach + disconnect to be safe
        const detach = get().socketDetach;
        if (detach) {
          try { detach(); } catch {}
          set({ socketDetach: null });
        }
        disconnectSocket();
        set({ user: null, isAuthenticated: false });
        return { success: false };
      }

      set({ user, isAuthenticated: true });

      if (user.accessToken) {
        initSocket({
          accessToken: user.accessToken,
          userId: user._id,
          deviceId: get().deviceId,
        });
        get().ensureAttachSocket();
      }

      return { success: true };
    } catch (err) {
      // on failure detach + disconnect to prevent stale handlers
      const detach = get().socketDetach;
      if (detach) {
        try { detach(); } catch {}
        set({ socketDetach: null });
      }
      disconnectSocket();
      set({ user: null, isAuthenticated: false });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  /* ==========================================================
     LOGOUT
     ========================================================== */
  logout: async () => {
    try {
      await api.post(
        "/auth/logout",
        { deviceId: get().deviceId },
        { withCredentials: true }
      );

      // detach socket handlers then disconnect
      const detach = get().socketDetach;
      if (detach) {
        try {
          detach();
        } catch (e) {
          console.warn("socket detach failed", e);
        }
        set({ socketDetach: null });
      }

      disconnectSocket();
      set({ user: null, isAuthenticated: false });

      toast.success("Logged out");
    } catch (err) {
      toast.error("Logout failed");
    }
  },

  /* ==========================================================
     Email cache helpers (exposed)
     ========================================================== */
  setLastEmail: (email) => {
    try {
      localStorage.setItem(EMAIL_CACHE_KEY, email);
    } catch { }
  },
  getLastEmail: () => {
    try {
      return localStorage.getItem(EMAIL_CACHE_KEY) || "";
    } catch {
      return "";
    }
  },
}));

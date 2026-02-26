// src/store/useAuthStore.js
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import api from "@/api/axios";

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
import { backupPrivateKeyToServer, getOrCreateDeviceKeypair, restorePrivateKeyFromServer } from "@/lib/deviceKeys";
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
  loading: true,
  deviceId: getOrCreateDeviceId(),

  // holds detach function returned by attachSocketHandlers
  socketDetach: null,

  getDeviceId: () => get().deviceId,

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

      // 1️⃣ LOGIN FIRST
      const res = await api.post(
        "/auth/verify-otp",
        {
          email,
          otp,
          deviceId,
        },
        { withCredentials: true }
      );

      const { user, accessToken } = res.data?.data;
      if (!user) throw new Error("Invalid login response");

      set({ user, isAuthenticated: true });

      // 2️⃣ RESTORE OR CREATE ENCRYPTION IDENTITY
      let restored = false;

      try {
        restored = await restorePrivateKeyFromServer(email);
      } catch (e) {
        console.log("Restore failed:", e.message);
      }

      let publicKeyBase64;

      if (restored) {
        const kp = getOrCreateDeviceKeypair();
        publicKeyBase64 = kp.publicKeyBase64;
      } else {
        const kp = getOrCreateDeviceKeypair();
        publicKeyBase64 = kp.publicKeyBase64;

        await backupPrivateKeyToServer(email);
      }

      // 3️⃣ REGISTER DEVICE (ENCRYPTION IDENTITY)
      await api.post(
        "/devices/register",
        {
          deviceId,
          deviceName: navigator.userAgent,
          publicKey: publicKeyBase64,
        },
        { withCredentials: true }
      );

      // 4️⃣ START SOCKET
      initSocket({ accessToken, userId: user._id, deviceId });
      get().ensureAttachSocket();

      localStorage.setItem("connecto_last_email", email);

      return { success: true, user };

    } catch (err) {
      throw err?.response?.data?.message
        ? new Error(err.response.data.message)
        : err;
    }
  },




  /* ==========================================================
     CHECK AUTH ON PAGE LOAD
     ========================================================== */
  checkAuth: async () => {
    set({ loading: true });

    try {
      const res = await api.get("/auth/check", {
        withCredentials: true,
      });

      const user = res.data?.data;

      if (!user) {
        set({ user: null, isAuthenticated: false });
        return { success: false };
      }

      set({ user, isAuthenticated: true });

      initSocket({
        accessToken: user.accessToken,
        userId: user._id,
        deviceId: get().deviceId,
      });
      get().ensureAttachSocket();


      return { success: true };

    } catch (err) {
      // ❗ DO NOT LOGOUT HERE
      // If refresh fails, interceptor will clear auth store.
      console.warn("checkAuth failed (waiting for interceptor)", err?.response?.status);

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

    } catch (err) {
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

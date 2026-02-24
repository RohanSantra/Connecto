// src/api/axios.js
import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

/* ==========================================================
   Refresh Handling
========================================================== */

let isRefreshing = false;
let failedQueue = [];
let hasShownSessionExpired = false;

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

/* ==========================================================
   REQUEST INTERCEPTOR
========================================================== */

API.interceptors.request.use(
  (config) => {
    const deviceId = useAuthStore.getState().deviceId;
    if (deviceId) {
      config.headers["x-device-id"] = deviceId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ==========================================================
   RESPONSE INTERCEPTOR
========================================================== */

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) return Promise.reject(error);

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => API(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await API.post("/auth/refresh");

      processQueue(null);
      return API(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      const authStore = useAuthStore.getState();

      try {
        const detach = authStore.socketDetach;
        if (detach) {
          detach();
          authStore.set({ socketDetach: null });
        }

        const { disconnectSocket } = await import("@/lib/socket.js");
        disconnectSocket();
      } catch { }

      authStore.set({ user: null, isAuthenticated: false });


      if (!hasShownSessionExpired) {
        toast.error("Session expired. Please log in again.", { id: "session-expired" });
        hasShownSessionExpired = true;
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default API;

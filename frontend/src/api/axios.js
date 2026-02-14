// src/api/axios.js
import axios from "axios";
import {useAuthStore} from "@/store/useAuthStore"; // or import { useAuthStore } depending on your exports

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

// ---------- refresh handling ----------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Helper: call refresh endpoint
const doRefresh = async () => {
  return API.post("/auth/refresh", {}, { withCredentials: true });
};

API.interceptors.request.use((config) => {
  const deviceId = useAuthStore.getState().deviceId;
  if (deviceId) config.headers["x-device-id"] = deviceId;
  return config;
});

// Request interceptor: optionally attach Authorization header when we have access token in memory
API.interceptors.request.use(
  (config) => {
    // if you keep accessToken in memory (in store) and want to set Authorization header:
    try {
      const store = useAuthStore.getState ? useAuthStore : null;
      const accessToken = store?.getState?.()?.user?.accessToken || null;
      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with refresh logic
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no config (some other error), just reject
    if (!originalRequest) return Promise.reject(error);

    // If this request already retried, don't get into loop
    if (originalRequest._retry) return Promise.reject(error);

    // If 401 -> attempt refresh (but don't try to refresh for refresh endpoint itself)
    if (error.response && error.response.status === 401 && !originalRequest.url.includes("/auth/refresh")) {
      // If a refresh is already happening, queue the request
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // After refresh succeeded, retry original request
            originalRequest._retry = true;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Start refresh
      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const refreshResp = await doRefresh();

        // server returns new accessToken in body (your route does)
        const newAccessToken = refreshResp?.data?.data?.accessToken || refreshResp?.data?.accessToken || null;

        // Update auth store and socket if needed
        try {
          const authStore = useAuthStore.getState ? useAuthStore : null;
          if (authStore) {
            // optionally re-check user to get fresh profile
            // call /auth/check to get user data (safe, the new access token is also set as cookie by server)
            const check = await API.get("/auth/check", { withCredentials: true });
            const user = check?.data?.data;
            if (user) {
              authStore.set({ user, isAuthenticated: true });
              // ensure socket is initialized using new accessToken
              try {
                const { initSocket, getSocket } = await import("@/lib/socket.js");
                initSocket({ accessToken: user.accessToken || newAccessToken, userId: user._id, deviceId: authStore.getState().deviceId });
                // attach handlers if needed
                const ensureAttach = authStore.getState()?.ensureAttachSocket;
                if (ensureAttach) ensureAttach();
              } catch (e) { /* swallowing socket errors */ }
            }
          }
        } catch (e) {
          // non-fatal
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry original request
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed -> logout / redirect to login
        try {
          const authStore = useAuthStore.getState ? useAuthStore : null;
          if (authStore) {
            // cleanup store, sockets etc
            const detach = authStore.getState()?.socketDetach;
            if (detach) {
              try { detach(); } catch {}
              authStore.set({ socketDetach: null });
            }
            try {
              const { disconnectSocket } = await import("@/lib/socket.js");
              disconnectSocket();
            } catch {}
            authStore.set({ user: null, isAuthenticated: false });
          }
        } catch (e) {}

        return Promise.reject(refreshError);
      }
    }

    // Other errors
    return Promise.reject(error);
  }
);

export default API;

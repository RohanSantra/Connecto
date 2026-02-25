// src/lib/socket.js
import { io } from "socket.io-client";
import { ChatEventEnum } from "@/constants.js";

let socket = null;
let connectedEventReceived = false;

/* =========================================================
   INIT
========================================================= */
export function initSocket({ accessToken, userId, deviceId }) {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionAttempts: Infinity,
    auth: {
      token: accessToken || null,
      deviceId: deviceId || null,
    },
    pingTimeout: 60000,
  });

  /* Fallback handshake */
  socket.on("connect", () => {
    setTimeout(() => {
      if (!connectedEventReceived && userId) {
        socket.emit("user_connected", { userId, deviceId });
      }
    }, 300);
  });

  socket.on("disconnect", () => {
    connectedEventReceived = false;
  });

  socket.on(ChatEventEnum.CONNECTED_EVENT, (payload) => {
    connectedEventReceived = true;
    console.log("[socket] connected", payload);
  });

  socket.on(ChatEventEnum.SOCKET_ERROR_EVENT, (err) => {
    console.error("[socket] error", err);
  });

  return socket;
}

/* =========================================================
   DISCONNECT
========================================================= */
export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  connectedEventReceived = false;
}

export function getSocket() {
  return socket;
}

/* =========================================================
   ROOMS
========================================================= */
export function joinChat(chatId) {
  socket?.emit(ChatEventEnum.JOIN_CHAT_EVENT, chatId);
}
export function leaveChat(chatId) {
  socket?.emit(ChatEventEnum.LEAVE_CHAT_EVENT, chatId);
}

/* =========================================================
   TYPING
========================================================= */
export function sendTyping(chatId, userId) {
  socket?.emit(ChatEventEnum.TYPING_EVENT, { chatId, userId });
}
export function stopTyping(chatId, userId) {
  socket?.emit(ChatEventEnum.STOP_TYPING_EVENT, { chatId, userId });
}

/* =========================================================
   MESSAGES
========================================================= */
export function sendMessageSocket(payload) {
  if (!payload?.chatId) throw new Error("chatId required");
  socket?.emit(ChatEventEnum.MESSAGE_SEND_EVENT, payload); // ⚠ fixed event
}

/* =========================================================
   🔥 CALL SIGNALING (NEW)
   This is the WebRTC pipe
========================================================= */

/**
 * Send WebRTC offer/answer/ice
 * payload: { callId, chatId, toUserId, data }
 */
export function sendCallSignal(payload) {
  socket?.emit("call:signal", payload);
}

/**
 * Listen to incoming WebRTC signal
 */
export function onCallSignal(handler) {
  socket?.on("call:signal", handler);
}

/**
 * Remove listener
 */
export function offCallSignal(handler) {
  socket?.off("call:signal", handler);
}

/* =========================================================
   CALL HELPERS (optional convenience)
========================================================= */
export function emitCallEvent(event, payload) {
  socket?.emit(event, payload);
}

/* =========================================================
   USER STATUS
========================================================= */
export function getUserStatus(userId) {
  return new Promise((resolve) => {
    socket?.emit("get_user_status", userId, (resp) => resolve(resp));
  });
}

/* Generic emit */
export function emitEvent(event, payload) {
  socket?.emit(event, payload);
}

// src/constants.js
export const ChatEventEnum = Object.freeze({
  // ----------------------------------
  // 🔹 Auth & OTP
  // ----------------------------------
  OTP_SENT_EVENT: "otp:sent",
  OTP_CANCELLED_EVENT: "otp:cancelled",
  GOOGLE_LOGIN_EVENT: "auth:google_login",

  // ----------------------------------
  // 🔹 Socket Connection
  // ----------------------------------
  CONNECTED_EVENT: "socket:connected",
  DISCONNECT_EVENT: "socket:disconnect",
  SOCKET_ERROR_EVENT: "socket:error",

  // ----------------------------------
  // 🔹 Chat
  // ----------------------------------
  JOIN_CHAT_EVENT: "chat:join",
  LEAVE_CHAT_EVENT: "chat:leave",
  NEW_CHAT_EVENT: "chat:new",
  CHAT_PINNED_EVENT: "chat:pinned",
  CHAT_UNPINNED_EVENT: "chat:unpinned",
  CHAT_DELETED_EVENT: "chat:deleted",

  // ----------------------------------
  // 🔹 Messaging
  // ----------------------------------
  MESSAGE_RECEIVED_EVENT: "message:received",
  MESSAGE_EDIT_EVENT: "message:edited",
  MESSAGE_DELETE_EVENT: "message:deleted",
  CHAT_CLEARED_EVENT: "message:cleared",
  MESSAGE_PIN_EVENT: "message:pinned",
  MESSAGE_UNPIN_EVENT: "message:unpinned",
  MESSAGE_DELIVERED_EVENT: "message:delivered",
  MESSAGE_READ_EVENT: "message:read",
  TYPING_EVENT: "message:typing",
  STOP_TYPING_EVENT: "message:stop_typing",

  // ----------------------------------
  // 🔹 Reactions
  // ----------------------------------
  MESSAGE_REACTION_ADDED_EVENT: "message:reaction_added",
  MESSAGE_REACTION_REMOVED_EVENT: "message:reaction_removed",

  // ----------------------------------
  // 🔹 Group Chat
  // ----------------------------------
  UPDATE_GROUP_NAME_EVENT: "group:name_updated",
  UPDATE_GROUP_AVATAR_EVENT: "group:avatar_updated",
  GROUP_MEMBER_ADDED_EVENT: "group:member_added",
  GROUP_MEMBER_REMOVED_EVENT: "group:member_removed",

  // ----------------------------------
  // 🔹 User & Profile
  // ----------------------------------
  USER_PROFILE_UPDATED: "user:profile_updated",
  USER_AVATAR_UPDATED: "user:avatar_updated",
  USER_STATUS_UPDATED: "user:status_updated",
  USER_ONLINE_EVENT: "user:online",
  USER_OFFLINE_EVENT: "user:offline",
  USER_DELETED_EVENT: "user:deleted",
  USER_REACTIVATED_EVENT: "user:reactivated",
  USER_ROLE_UPDATED: "user:role_updated",

  // ----------------------------------
  // 🔹 Chat member roles
  // ----------------------------------
  MEMBER_PROMOTED_EVENT: "group:member_promoted",
  MEMBER_DEMOTED_EVENT: "group:member_demoted",

  // ----------------------------------
  // 🔹 Device & Multi-Device
  // ----------------------------------
  DEVICE_REGISTERED_EVENT: "device:registered",
  DEVICE_PRIMARY_CHANGED_EVENT: "device:primary_changed",
  DEVICE_LOGGED_OUT_EVENT: "device:logged_out",
  DEVICE_REMOVED_EVENT: "device:removed",
  DEVICE_KEYS_ROTATED_EVENT: "device:keys_rotated",
  DEVICE_DISCONNECTED_EVENT: "device:disconnected",

  // ----------------------------------
  // 🔹 Calls
  // ----------------------------------
  CALL_RINGING_EVENT: "call:ringing",
  CALL_ACCEPTED_EVENT: "call:accepted",
  CALL_REJECTED_EVENT: "call:rejected",
  CALL_ENDED_EVENT: "call:ended",
  CALL_MISSED_EVENT: "call:missed",
});


export const SHORTCUTS = [
  {
    group: "Global",
    items: [
      { keys: ["Ctrl", "K"], description: "Open command palette / global search" },
      { keys: ["Ctrl", "/"], description: "Open Help / Shortcuts overlay" },
    ],
  },
  {
    group: "Create",
    items: [
      { keys: ["Alt", "N"], description: "New chat" },
      { keys: ["Ctrl", "G"], description: "New group" },
    ],
  },
  {
    group: "Navigation & Panels",
    items: [
      { keys: ["Ctrl", "D"], description: "Toggle details panel" },
      { keys: ["Ctrl", ","], description: "Open Settings" },
      { keys: ["Ctrl", "X"], description: "Close chat / close chat area" },
      { keys: ["/"], description: "Focus sidebar search" },
      { keys: ["Arrow ↑ / Arrow ↓"], description: "Navigate results in sidebar search" },
      { keys: ["Enter"], description: "Open selected chat in sidebar search" },
      { keys: ["Esc"], description: "Blur search / clear focus" },
    ],
  },
  {
    group: "Composer",
    items: [
      { keys: ["Enter"], description: "Send message" },
      { keys: ["Shift", "Enter"], description: "Insert newline" },
      { keys: ["Ctrl/Meta", "Enter"], description: "Insert newline (also supported)" },
    ],
  },
  {
    group: "Calls",
    items: [
      { keys: ["Enter"], description: "Answer incoming call" },
      { keys: ["Esc"], description: "Reject incoming / cancel outgoing call" },
      { keys: ["Esc"], description: "Cancel outgoing call (also shown in call UI)" },
    ],
  },
  {
    group: "Dialogs & Overlays",
    items: [
      { keys: ["Esc"], description: "Close alert dialogs, modals, and overlays (when focused)" },
      { keys: ["Ctrl", "/"], description: "Open this Shortcuts overlay" }
    ],
  },
];


export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "hi", name: "Hindi" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ar", name: "Arabic" },
];

export const APP_INFO = {
  name: "Connecto",
  version: "1.0.0",
  platform: "Web",
  environment: "Production",

  supportEmail: "support@connecto.app",
  securityEmail: "security@connecto.app",
  legalEmail: "legal@connecto.app",
};

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import api from "@/api/axios";
import { decryptIncomingMessageWithReply } from "@/lib/decryption";
import { useChatStore } from "./useChatStore";
import { useProfileStore } from "./useProfileStore";
import { normalizeLastMessage } from "@/lib/normalize";
import { getSocket } from "@/lib/socket";
import { ChatEventEnum } from "@/constants";

/* Utility: dedupe + sort chronologically (oldest -> newest) */
/* Utility: dedupe + reconcile optimistic & real messages */
const mergeMessages = (existing = [], incoming = []) => {
  const map = new Map();

  const add = (m) => {
    if (!m) return;

    const rawId = m._id ? String(m._id) : null;
    const isTempId = rawId && rawId.startsWith && rawId.startsWith("temp-");

    // optimistic key
    const tempKey = m.clientTempId || m.tempId || (isTempId ? rawId : null);

    // real database id
    const realKey = rawId && !isTempId ? rawId : null;

    // If real message arrives and an optimistic version exists → remove optimistic
    if (realKey && tempKey && map.has(String(tempKey))) {
      map.delete(String(tempKey));
    }

    const key = realKey || tempKey || rawId || Math.random().toString(36);
    map.set(String(key), m);
  };

  // Existing first, incoming after (incoming wins)
  for (const m of existing) add(m);
  for (const m of incoming) add(m);

  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
};



/* Helper to extract an id from several payload shapes. */
const getMessageId = (payload) => {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (payload.message && (payload.message._id || payload.message.id)) {
    return payload.message._id || payload.message.id;
  }
  return payload._id || payload.messageId || payload.id || null;
};

/* Normalize incoming payload -> full message object */
const extractFullMessage = (payload) => {
  if (!payload) return null;
  if (payload.message && typeof payload.message === "object") return payload.message;
  if (payload._id) return payload;
  return null;
};


const buildOptimisticAttachments = (previews = []) =>
  previews.map((p) => ({
    _optimistic: true,
    filename: p.file?.name || "file",
    size: p.file?.size || 0,
    mimeType: p.file?.type || "",
    previewUrl: p.url, // object URL
  }));

export const useMessageStore = create(
  persist(
    (set, get) => {
      // Buffers to hold receipts that arrive before the message
      const deliveredBuffer = new Map(); // messageId -> [{ userId, deliveredAt }]
      const readBuffer = new Map(); // messageId -> [{ userId, readAt }]

      const mergeBufferedReceiptsForMessage = (message) => {
        if (!message || !message._id) return message;

        const id = String(message._id);
        let changed = false;
        const m = { ...message };

        // delivered
        const dbuf = deliveredBuffer.get(id);
        if (Array.isArray(dbuf) && dbuf.length) {
          m.deliveredTo = [...(m.deliveredTo || [])];
          for (const item of dbuf) {
            const already = (m.deliveredTo || []).some((x) => String(x.userId) === String(item.userId));
            if (!already) {
              m.deliveredTo.push({ userId: item.userId, deliveredAt: item.deliveredAt });
              changed = true;
            }
          }
          deliveredBuffer.delete(id);
        }

        // read
        const rbuf = readBuffer.get(id);
        if (Array.isArray(rbuf) && rbuf.length) {
          m.readBy = [...(m.readBy || [])];
          for (const item of rbuf) {
            const already = (m.readBy || []).some((x) => String(x.userId) === String(item.userId));
            if (!already) {
              m.readBy.push({ userId: item.userId, readAt: item.readAt });
              changed = true;
            }
          }
          readBuffer.delete(id);
        }

        return changed ? m : message;
      };

      return {
        messages: [],
        pinnedMessages: [], // full message objects (decrypted where possible)
        loading: false,
        hasMore: true,
        currentPage: 1,
        replyTo: null,
        sending: false,
        deletingMessageId: false,
        clearedAt: {},
        scrollToMessageId: null,

        setScrollToMessage(id) {
          set({ scrollToMessageId: id });
        },

        setReplyTo: (msg) => set({ replyTo: msg }),

        /* -------------------------
           Messages fetching
        ------------------------- */
        fetchMessages: async (chatId, page = 1, limit = 25) => {
          if (!chatId) return [];

          if (page === 1) set({ loading: true });

          try {
            const res = await api.get(`/messages/${chatId}?page=${page}&limit=${limit}`, {
              withCredentials: true,
            });

            const raw = res.data?.data || [];

            const decrypted = raw.map((msg) => {
              try {
                return decryptIncomingMessageWithReply(msg);
              } catch (err) {
                console.warn("Decrypt failed for message:", msg?._id, err);
                return msg;
              }
            });

            const current = get().messages;
            const merged = page === 1 ? decrypted : mergeMessages(current, decrypted);
            const myId = useProfileStore.getState().profile?.userId;
            const clearedTime = get().clearedAt[chatId];

            const filtered = merged.filter(m => {
              // clear chat filtering KEEP
              if (clearedTime) {
                const created = new Date(m.createdAt);
                if (created <= new Date(clearedTime)) return false;
              }

              // ❗ DO NOT FILTER deleted-for-me messages anymore
              return true;
            });

            set({
              messages: filtered,
              currentPage: page,
              hasMore: decrypted.length === Number(limit),
            });

            return decrypted;
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load messages");
            return [];
          } finally {
            if (page === 1) set({ loading: false });
          }
        },

        /* -------------------------
           Send message
        ------------------------- */
        sendMessage: async (formData, ui = {
          plaintext,
          previews,
          replyTo,
        }) => {
          const profile = useProfileStore.getState().profile;
          const myUserId = profile?.userId;
          const chatId = formData.get("chatId");

          if (!chatId || !myUserId) {
            toast.error("Unable to send message");
            return null;
          }

          // ---------------------------
          // 1️⃣ OPTIMISTIC MESSAGE
          // ---------------------------
          const tempId = `temp-${crypto.randomUUID?.() || Date.now() + Math.random()}`;
          const now = new Date().toISOString();



          const optimisticMessage = {
            _id: tempId,
            tempId,
            clientTempId: tempId, // 🔥 reconciliation id
            chatId,
            senderId: myUserId,
            plaintext: ui.plaintext || "",
            attachments: buildOptimisticAttachments(ui.previews),
            createdAt: now,
            deliveredTo: [],
            readBy: [],
            status: "sending",
            replyTo: ui.replyTo?._id || null,
            replyMessage: ui.replyTo || null,
          };

          // Insert using mergeMessages (NOT push)
          set((state) => ({
            messages: mergeMessages(state.messages, [optimisticMessage]),
          }));

          try {
            const deviceId = localStorage.getItem("connecto_device_id");

            // send clientTempId to server (so socket & API echo it)
            if (typeof formData.append === "function") {
              formData.append("clientTempId", tempId);
            }

            const res = await api.post("/messages/send", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
                "x-device-id": deviceId,
              },
              withCredentials: true,
            });

            let msg = res.data?.data;
            if (!msg) throw new Error("Invalid message response");

            try {
              msg = decryptIncomingMessageWithReply(msg);
            } catch { }

            // ---------------------------
            // 2️⃣ MERGE REAL MESSAGE
            // (handles socket vs api race)
            // ---------------------------
            set((state) => ({
              messages: mergeMessages(state.messages, [msg]),
            }));

            // Update sidebar last message
            try {
              const normalized = normalizeLastMessage(msg);
              useChatStore.setState((s) => {
                const chats = s.chats.map((c) =>
                  String(c.chatId) === String(msg.chatId)
                    ? { ...c, lastMessage: normalized, updatedAt: msg.createdAt }
                    : c
                );

                const activeChat =
                  s.activeChat && String(s.activeChat.chatId) === String(msg.chatId)
                    ? { ...s.activeChat, lastMessage: normalized, updatedAt: msg.createdAt }
                    : s.activeChat;

                return { chats, activeChat };
              });
            } catch { }

            return msg;
          } catch (err) {
            // Mark optimistic message as failed
            set((state) => ({
              messages: state.messages.map((m) =>
                m.tempId === tempId ? { ...m, status: "failed" } : m
              ),
            }));

            toast.error(err?.response?.data?.message || "Failed to send message");
            return null;
          }
        },



        /* -------------------------
           Edit / Delete
        ------------------------- */
        editMessage: async (messageId, ciphertext, nonce) => {
          try {
            const res = await api.put(
              `/messages/${messageId}/edit`,
              { ciphertext, ciphertextNonce: nonce },
              { withCredentials: true }
            );

            let updated = res.data?.data;
            if (!updated) return;

            try {
              updated = decryptIncomingMessageWithReply(updated);
            } catch { /* ignore */ }

            set((state) => ({
              messages: state.messages.map((m) =>
                String(m._id) === String(messageId) ? updated : m
              ),
            }));

            toast.info("Message edited");
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to edit message");
          }
        },

        deleteMessage: async (messageId, forEveryone = false) => {

          set({ deletingMessageId: true })

          try {
            const state = get();
            const currentUserId = useProfileStore.getState().profile?.userId;

            await api.delete(`/messages/${messageId}?forEveryone=${forEveryone}`, {
              withCredentials: true,
            });

            set((state) => ({
              messages: state.messages.map((m) => {
                if (String(m._id) !== String(messageId)) return m;

                if (forEveryone) {
                  return {
                    ...m,
                    deleted: true,
                    plaintext: "",
                    content: "",
                    attachments: [],
                  };
                }

                return {
                  ...m,
                  deletedFor: [...(m.deletedFor || []), currentUserId],
                };
              }),

              pinnedMessages: forEveryone
                ? state.pinnedMessages.filter((m) => String(m._id) !== String(messageId)) // 💥 remove pin
                : state.pinnedMessages.map((m) =>
                  String(m._id) === String(messageId)
                    ? { ...m, deletedFor: [...(m.deletedFor || []), currentUserId] }
                    : m
                ),
            }));
          } catch (error) {
            toast.error("Failed to delete message");
            return [];
          } finally {
            set({ deletingMessageId: false })
          }
        },

        clearChatForUser: async (chatId) => {
          if (!chatId) return;
          const userId = useProfileStore.getState().profile?.userId;

          try {
            await api.patch(`/messages/${chatId}/clear`, {}, { withCredentials: true });

            const now = new Date().toISOString();

            set((state) => ({
              clearedAt: {
                ...state.clearedAt,
                [chatId]: now,
              },
              messages: state.messages.filter(m => String(m.chatId) !== String(chatId)),
              pinnedMessages: state.pinnedMessages.filter(m => String(m.chatId) !== String(chatId)),
            }));

            useChatStore.getState().onChatClearedSocket({ chatId, userId });

            toast.success("Chat cleared");
          } catch (err) {
            console.warn("clearChat failed:", err?.message);
          }
        },

        /* -------------------------
           Reactions
        ------------------------- */
        fetchReactions: async (messageId, emoji = null) => {
          try {
            const q = emoji ? `?emoji=${encodeURIComponent(emoji)}` : "";
            const res = await api.get(`/messages/${messageId}/reactions${q}`, { withCredentials: true });
            // returns array of { emoji, count, users: [...] }
            return res.data?.data || [];
          } catch (err) {
            console.warn("fetchReactions failed:", err?.response?.data?.message || err?.message || err);
            return [];
          }
        },

        addReaction: async (messageId, reaction) => {
          try {
            await api.post(
              `/messages/${messageId}/reaction`,
              { reaction },
              { withCredentials: true }
            );
            // server broadcasts; socket handler updates store
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to react");
          }
        },

        removeReaction: async (messageId) => {
          try {
            await api.delete(`/messages/${messageId}/reaction`, {
              withCredentials: true,
            });
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to remove reaction");
          }
        },

        /* -------------------------
           Pin management (client -> server)
        ------------------------- */
        pinMessage: async (chatId, messageId) => {
          try {
            const res = await api.post(`/messages/${chatId}/pin/${messageId}`, {}, { withCredentials: true });
            const fresh = res.data?.data;

            let decrypted = fresh;
            try { decrypted = decryptIncomingMessageWithReply(fresh); } catch { }

            set((state) => {
              const exists = state.pinnedMessages.some((m) => String(m._id) === String(messageId));
              return {
                pinnedMessages: exists ? state.pinnedMessages : [...state.pinnedMessages, decrypted],
                messages: state.messages.map((m) => (String(m._id) === String(messageId) ? { ...m, pinned: true } : m)),
              };
            });

            toast.success("Pinned");
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to pin message");
          }
        },

        unpinMessage: async (chatId, messageId) => {
          try {
            const res = await api.delete(`/messages/${chatId}/unpin/${messageId}`, { withCredentials: true });
            const fresh = res.data?.data;

            set((state) => ({
              pinnedMessages: state.pinnedMessages.filter((m) => String(m._id) !== String(messageId)),
              messages: state.messages.map((m) => (String(m._id) === String(messageId) ? { ...m, pinned: false } : m)),
            }));

            toast.info("Unpinned");
          } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to unpin");
          }
        },

        /* -------------------------
           Media / Docs helpers
        ------------------------- */
        fetchMedia: async (chatId) => {
          try {
            const res = await api.get(`/messages/media/${chatId}`, { withCredentials: true });
            return res.data?.data || [];
          } catch {
            return [];
          }
        },

        fetchDocuments: async (chatId) => {
          try {
            const res = await api.get(`/messages/docs/${chatId}`, { withCredentials: true });
            return res.data?.data || [];
          } catch {
            return [];
          }
        },

        /* -------------------------
           PINNED MESSAGES (new)
           - pinnedMessages stores full message objects (decrypted where possible)
        ------------------------- */
        fetchPinnedMessages: async (chatId) => {
          if (!chatId) return [];
          try {
            const res = await api.get(`/messages/${chatId}/pinned`, { withCredentials: true });
            const raw = res.data?.data || [];

            // server now returns fully populated message objects (see controller)
            const decrypted = await Promise.all(raw.map(async (m) => {
              try { return decryptIncomingMessageWithReply(m); } catch { return m; }
            }));

            set({ pinnedMessages: decrypted });
            return decrypted;
          } catch (err) {
            console.warn("fetchPinnedMessages failed:", err?.message || err);
            return [];
          }
        },

        refreshPinnedMessages: async (chatId) => {
          return get().fetchPinnedMessages(chatId);
        },

        getPinnedMessageById: (id) => {
          if (!id) return null;
          const state = get();
          return state.pinnedMessages.find((m) => String(m._id) === String(id)) || null;
        },

        /* =============================================================
           SOCKET HANDLERS
           - decrypt whenever possible
           - buffers for out-of-order receipts
        ============================================================= */

        receiveMessage: (payload) => {
          if (!payload) return;

          const full = payload.message && typeof payload.message === "object"
            ? payload.message
            : payload;

          const chatId = payload.chatId || full?.chatId;
          if (!full?._id || !chatId) return;

          let decrypted;
          try {
            decrypted = decryptIncomingMessageWithReply(full);
          } catch {
            decrypted = full;
          }

          // Merge any buffered receipts
          decrypted = mergeBufferedReceiptsForMessage(decrypted);

          const chatStore = useChatStore.getState();
          const activeChatId = chatStore.activeChatId;
          const myUserId = chatStore.currentUserId || "";
          const isActive = String(chatId) === String(activeChatId);
          const isOwnMessage = String(decrypted.senderId) === String(myUserId);

          if (isOwnMessage) return;

          // Update sidebar
          useChatStore.setState((state) => {
            const updatedChats = state.chats.map((c) => {
              if (String(c.chatId) !== String(chatId)) return c;
              return {
                ...c,
                lastMessage: normalizeLastMessage(decrypted),
                updatedAt: decrypted.createdAt,
                unreadCount:
                  !isActive && !isOwnMessage
                    ? (c.unreadCount || 0) + 1
                    : c.unreadCount || 0,
              };
            });

            updatedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            return { chats: updatedChats };
          });

          // Add to messages (if we keep loaded messages for other chats too)
          const myId = useProfileStore.getState().profile?.userId;
          const clearedTime = get().clearedAt[chatId];
          const created = new Date(decrypted.createdAt);

          if (clearedTime && created <= new Date(clearedTime)) return;

          set((state) => ({
            messages: mergeMessages(state.messages, [decrypted]),
          }));


          // optimistic delivered emit for non-own messages
          const socket = getSocket();
          if (socket && !isOwnMessage) {
            try {
              socket.emit(ChatEventEnum.MESSAGE_DELIVERED_EVENT, {
                messageId: decrypted._id,
                chatId: decrypted.chatId,
                userId: myUserId,
                deliveredAt: new Date(),
              });
            } catch (e) { /* ignore */ }
          }

          // Auto-mark read if active + not own message
          if (isActive && !isOwnMessage) {
            try {
              socket?.emit(ChatEventEnum.MESSAGE_READ_EVENT, {
                chatId: decrypted.chatId,
                readUpToId: decrypted._id,
              });
              api.patch(`/messages/${decrypted.chatId}/read`, { readUpToId: decrypted._id }).catch(() => { });
            } catch (e) { /* ignore */ }
          }

          // reset unread count if active
          if (isActive) {
            useChatStore.setState((s) => ({
              chats: s.chats.map((c) =>
                String(c.chatId) === String(chatId) ? { ...c, unreadCount: 0 } : c
              ),
            }));
          }
        },

        editMessageSocket: (payload) => {
          const full = extractFullMessage(payload);
          if (!full || !full._id) return;

          let updated;
          try { updated = decryptIncomingMessageWithReply(full); } catch { updated = full; }
          updated = mergeBufferedReceiptsForMessage(updated);

          set((state) => ({
            messages: state.messages.map((m) => (String(m._id) === String(updated._id) ? updated : m)),
            pinnedMessages: state.pinnedMessages.map((m) => (String(m._id) === String(updated._id) ? updated : m)),
          }));
        },

        deleteMessageSocket: (payload) => {
          const full = extractFullMessage(payload);
          const id = getMessageId(payload);
          if (!id) return;

          const actorId = String(payload.actorId || "");
          const isForAll = payload.forEveryone === true;

          const applyDelete = (m) => {
            if (String(m._id) !== String(id)) return m;

            if (isForAll) {
              return {
                ...m,
                deleted: true,
                pinned: false,            // 💥 ensure UI unpins
                plaintext: "",
                content: "",
                attachments: [],
              };
            }

            // delete only for actor (dedupe)
            const old = Array.isArray(m.deletedFor) ? m.deletedFor.map(String) : [];
            if (!old.includes(actorId)) old.push(actorId);
            return { ...m, deletedFor: old };
          };

          set((state) => ({
            messages: state.messages.map(applyDelete),
            pinnedMessages: isForAll
              ? state.pinnedMessages.filter((p) => String(p._id) !== String(id)) // 💥 remove pin
              : state.pinnedMessages.map(applyDelete),
          }));
        },

        addReactionSocket: (payload) => {
          const full = extractFullMessage(payload);

          if (full && full._id) {
            let updated;
            try { updated = decryptIncomingMessageWithReply(full); } catch { updated = full; }
            updated = mergeBufferedReceiptsForMessage(updated);

            set((state) => ({
              messages: state.messages.map((m) => (String(m._id) === String(updated._id) ? updated : m)),
              pinnedMessages: state.pinnedMessages.map((m) => (String(m._id) === String(updated._id) ? updated : m)),
            }));
            return;
          }

          const { messageId, reaction, byUserId } = payload || {};
          if (!messageId) return;

          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? {
                  ...m,
                  reactions: [
                    ...(m.reactions || []).filter((r) => String(r.userId) !== String(byUserId)),
                    { userId: byUserId, reaction },
                  ],
                }
                : m
            ),
            pinnedMessages: state.pinnedMessages.map((m) =>
              String(m._id) === String(messageId)
                ? {
                  ...m,
                  reactions: [
                    ...(m.reactions || []).filter((r) => String(r.userId) !== String(byUserId)),
                    { userId: byUserId, reaction },
                  ],
                }
                : m
            ),
          }));
        },

        removeReactionSocket: (payload) => {
          const full = extractFullMessage(payload);

          if (full && full._id) {
            let updated;
            try { updated = decryptIncomingMessageWithReply(full); } catch { updated = full; }
            updated = mergeBufferedReceiptsForMessage(updated);

            set((state) => ({
              messages: state.messages.map((m) => (String(m._id) === String(updated._id) ? updated : m)),
              pinnedMessages: state.pinnedMessages.map((m) => (String(m._id) === String(updated._id) ? updated : m)),
            }));
            return;
          }

          const { messageId, byUserId } = payload || {};
          if (!messageId) return;

          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, reactions: (m.reactions || []).filter((r) => String(r.userId) !== String(byUserId)) }
                : m
            ),
            pinnedMessages: state.pinnedMessages.map((m) =>
              String(m._id) === String(messageId)
                ? { ...m, reactions: (m.reactions || []).filter((r) => String(r.userId) !== String(byUserId)) }
                : m
            ),
          }));
        },

        toggleReaction: async (messageId, emoji, currentUserId) => {
          const state = get();
          const msg = state.messages.find((m) => String(m._id) === String(messageId));

          const already = msg?.reactions?.some(
            (r) =>
              String(r.userId) === String(currentUserId) &&
              (r.reaction === emoji || r.emoji === emoji)
          );

          try {
            if (already) {
              await state.removeReaction(messageId);
            } else {
              await state.addReaction(messageId, emoji);
            }
          } catch (err) {
            console.log("toggleReaction failed", err);
          }
        },

        pinMessageSocket: async (payload) => {
          // If server sends full message -> use it. Otherwise fallback to messageId.
          const full = extractFullMessage(payload);
          if (full && full._id) {
            let decrypted = full;
            try { decrypted = decryptIncomingMessageWithReply(full); } catch { }
            decrypted = mergeBufferedReceiptsForMessage(decrypted);

            set((state) => {
              const exists = state.pinnedMessages.some((m) => String(m._id) === String(decrypted._id));
              return {
                pinnedMessages: exists ? state.pinnedMessages : [...state.pinnedMessages, decrypted],
                messages: state.messages.map((m) => (String(m._id) === String(decrypted._id) ? { ...m, pinned: true } : m)),
              };
            });
            return;
          }

          const id = getMessageId(payload);
          if (!id) return;

          // try to find message in local messages; if present mark pinned and add to pinnedMessages
          const local = get().messages.find((m) => String(m._id) === String(id));
          if (local) {
            set((state) => ({
              pinnedMessages: state.pinnedMessages.some((p) => String(p._id) === String(id)) ? state.pinnedMessages : [...state.pinnedMessages, local],
              messages: state.messages.map((m) => (String(m._id) === String(id) ? { ...m, pinned: true } : m)),
            }));
            return;
          }

          // otherwise fetch pinned list for the chat (best-effort)
          // If payload contains chatId, refresh pinned messages for that chat
          if (payload?.chatId) {
            get().fetchPinnedMessages(payload.chatId).catch(() => { });
          }
        },

        unpinMessageSocket: (payload) => {
          const full = extractFullMessage(payload);
          if (full && full._id) {
            const id = String(full._id);
            set((state) => ({
              pinnedMessages: state.pinnedMessages.filter((p) => String(p._id) !== id),
              messages: state.messages.map((m) => (String(m._id) === id ? { ...m, pinned: false } : m)),
            }));
            return;
          }

          const id = getMessageId(payload);
          if (!id) return;

          set((state) => ({
            pinnedMessages: state.pinnedMessages.filter((p) => String(p._id) !== String(id)),
            messages: state.messages.map((m) => (String(m._id) === String(id) ? { ...m, pinned: false } : m)),
          }));
        },

        /* -------------------------
           markDeliveredSocket
        ------------------------- */
        markDeliveredSocket: ({ messageId, chatId, userId, deliveredAt }) => {
          set((state) => {
            const msgs = (state.messages || []).map(m => {
              if (String(m._id || m.messageId) !== String(messageId)) return m;
              // merge deliveredTo with dedupe
              const old = m.deliveredTo || [];
              const incoming = userId ? [{ userId: String(userId), deliveredAt }] : [];
              const map = new Map();
              old.concat(incoming).forEach(it => { if (it?.userId) map.set(String(it.userId), it); });
              return { ...m, deliveredTo: Array.from(map.values()) };
            });
            return { messages: msgs };
          });

          // Also ensure chat list updated (in case sidebar relied on different path)
          get().refreshChatLastMessage?.(chatId, messageId); // optional helper
        },

        markReadSocket: ({ messageId, chatId, userId, readAt, readUpToId } = {}) => {
          if (!userId) return;

          const userEntry = { userId: String(userId), readAt: readAt ? new Date(readAt) : new Date() };

          set((state) => {
            let msgs = (state.messages || []).slice(); // copy

            // Helper: mark a single message (by id) as read (dedupe)
            const applyToMessage = (m) => {
              if (!m) return m;
              const old = m.readBy || [];
              const map = new Map();
              old.forEach(it => { if (it?.userId) map.set(String(it.userId), it); });
              map.set(String(userEntry.userId), userEntry);
              return { ...m, readBy: Array.from(map.values()) };
            };

            // 1) If messageId provided -> update that message (or buffer if not present)
            if (messageId) {
              const idx = msgs.findIndex(mm => String(mm._id || mm.messageId) === String(messageId));
              if (idx === -1) {
                // message not loaded yet -> buffer it so when message loads the read will be merged
                const idStr = String(messageId);
                const buf = readBuffer.get(idStr) || [];
                // dedupe buffer entries for same user
                const exists = buf.some(b => String(b.userId) === String(userEntry.userId));
                if (!exists) {
                  buf.push(userEntry);
                  readBuffer.set(idStr, buf);
                }
                return { messages: msgs };
              }

              msgs[idx] = applyToMessage(msgs[idx]);
              return { messages: msgs };
            }

            // 2) Chat-level readUpToId / readAt: apply to all loaded messages for that chat satisfying cutoff
            // Determine cutoff date. If readUpToId supplied and we have that message locally, use its createdAt.
            let cutoffDate = readAt ? new Date(readAt) : null;

            if (readUpToId) {
              const upIdx = msgs.findIndex(mm => String(mm._id || mm.messageId) === String(readUpToId));
              if (upIdx !== -1 && msgs[upIdx]?.createdAt) {
                cutoffDate = new Date(msgs[upIdx].createdAt);
              }
            }

            // If we still don't have cutoffDate, default to readAt (if server provided) or apply nothing.
            // We'll still attempt to mark messages older than readAt if readAt exists.
            if (!cutoffDate && !readAt) {
              // nothing to apply deterministically to loaded messages -> bail
              return { messages: msgs };
            }

            // Ensure cutoffDate is a Date
            cutoffDate = cutoffDate ? new Date(cutoffDate) : new Date();

            // Mark every loaded message in this chat with createdAt <= cutoff and not sent by reader
            msgs = msgs.map((m) => {
              const mChatId = String(m.chatId || m.chat || "");
              if (String(chatId) !== mChatId) return m;

              // don't mark messages sent by the reader as 'readBy' (they are the sender)
              const senderId = m.senderId || (m.sender && m.sender.userId) || null;
              if (senderId && String(senderId) === String(userEntry.userId)) return m;

              // createdAt compare (some messages might have string timestamps)
              const created = m.createdAt ? new Date(m.createdAt) : null;
              if (!created) return m;

              if (created <= cutoffDate) {
                return applyToMessage(m);
              }
              return m;
            });

            return { messages: msgs };
          });

        },

      };
    },
    {
      name: "connecto_message_state",
      partialize: (state) => ({ clearedAt: state.clearedAt }),
    }
  )
);

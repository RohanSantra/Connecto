// src/lib/socketHandlers.js
import { ChatEventEnum } from "@/constants.js";
import { useMessageStore } from "@/store/useMessageStore";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useCallStore } from "@/store/useCallStore";
import { useBlockStore } from "@/store/useBlockStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

/**
 * Attach all handlers (call once, after initSocket/getSocket())
 */
export function attachSocketHandlers(socket) {
    if (!socket) return;

    const log = (evt, p) => console.log(`[socket] ${evt}`, p);

    const message = useMessageStore.getState();
    const chat = useChatStore.getState();
    const profile = useProfileStore.getState();
    const device = useDeviceStore.getState();
    const call = useCallStore.getState();

    /* -----------------------
       MESSAGES
    ------------------------*/
    socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, (p) => {
        const { blockedUsers, blockedChats } = useBlockStore.getState();

        const senderId = p?.message?.sender?.userId || p?.message?.senderId;
        const chatId = p?.chatId;

        const { isUserBlocked } = useBlockStore.getState();
        if (isUserBlocked(senderId)) return;

        message.receiveMessage?.(p);
    });

    socket.on(ChatEventEnum.MESSAGE_EDIT_EVENT, (p) => {
        log(ChatEventEnum.MESSAGE_EDIT_EVENT, p);
        message.editMessageSocket?.(p.message);
    });

    socket.on(ChatEventEnum.MESSAGE_DELETE_EVENT, (p) => {
        message.deleteMessageSocket?.(p);
        chat.deleteMessageLastUpdateSocket?.(p);
    });

    socket.on(ChatEventEnum.CHAT_CLEARED_EVENT, (p) => {
        console.log("[socket] CHAT_CLEARED_EVENT", p);
        useMessageStore.getState().onChatClearedSocket?.(p);
        useChatStore.getState().onChatClearedSocket?.(p);
    });

    // MESSAGE_DELIVERED_EVENT
    socket.on(ChatEventEnum.MESSAGE_DELIVERED_EVENT, (p) => {
        // normalized payload extraction
        const messageId = p?.messageId || p?.message?._id || p?.message?.messageId || null;
        const chatId = p?.chatId || p?.chat?._id || null;
        const userId = p?.userId || p?.user?.userId || null;
        const deliveredAt = p?.deliveredAt ? new Date(p.deliveredAt) : (p?.timestamp ? new Date(p.timestamp) : new Date());

        // update message-level data (message store)
        message.markDeliveredSocket?.({
            messageId,
            chatId,
            userId: userId ? String(userId) : null,
            deliveredAt,
        });

        // update chat list lastMessage metadata (chat store)
        const deliveredTo = userId ? [{ userId: String(userId), deliveredAt }] : [];
        useChatStore.getState().updateLastMessageStatusSocket?.({
            chatId,
            messageId,       // may be null for chat-level events
            deliveredTo,
        });
    });

    // MESSAGE_READ_EVENT
    socket.on(ChatEventEnum.MESSAGE_READ_EVENT, (p) => {
        const messageId = p?.messageId || p?.message?._id || p?.message?.messageId || null;
        const chatId = p?.chatId || p?.chat?._id || null;
        const userId = p?.userId || p?.user?.userId || null;
        const readAt = p?.readAt ? new Date(p.readAt) : (p?.timestamp ? new Date(p.timestamp) : new Date());
        const readUpToId = p?.readUpToId || p?.readUpToMessageId || null;

        // update message-level store (bubbles)
        message.markReadSocket?.({
            messageId,
            chatId,
            userId: userId ? String(userId) : null,
            readAt,
            readUpToId,
        });

        // update chat list lastMessage metadata
        const readBy = userId ? [{ userId: String(userId), readAt }] : [];
        useChatStore.getState().updateLastMessageStatusSocket?.({
            chatId,
            messageId,   // may be null
            readBy,
            readUpToId,
            readAt,
        });
    });


    socket.on(ChatEventEnum.MESSAGE_REACTION_ADDED_EVENT, (p) => {
        log(ChatEventEnum.MESSAGE_REACTION_ADDED_EVENT, p);
        message.addReactionSocket?.(p);
    });

    socket.on(ChatEventEnum.MESSAGE_REACTION_REMOVED_EVENT, (p) => {
        log(ChatEventEnum.MESSAGE_REACTION_REMOVED_EVENT, p);
        message.removeReactionSocket?.(p);
    });

    socket.on(ChatEventEnum.MESSAGE_PIN_EVENT, (p) => {
        log(ChatEventEnum.MESSAGE_PIN_EVENT, p);
        message.pinMessageSocket?.(p);
    });

    socket.on(ChatEventEnum.MESSAGE_UNPIN_EVENT, (p) => {
        log(ChatEventEnum.MESSAGE_UNPIN_EVENT, p);
        message.unpinMessageSocket?.(p);
    });

    /* -----------------------
       CHAT (room-level)
    ------------------------*/
    socket.on(ChatEventEnum.NEW_CHAT_EVENT, (p) => {
        log(ChatEventEnum.NEW_CHAT_EVENT, p);
        chat.createOrAddChatSocket?.(p.chat);
    });

    socket.on(ChatEventEnum.CHAT_PINNED_EVENT, (p) => {
        log(ChatEventEnum.CHAT_PINNED_EVENT, p);
        chat.updateChatPinnedSocket?.(p);
    });

    socket.on(ChatEventEnum.CHAT_UNPINNED_EVENT, (p) => {
        log(ChatEventEnum.CHAT_UNPINNED_EVENT, p);
        chat.updateChatPinnedSocket?.(p);
    });

    socket.on(ChatEventEnum.CHAT_DELETED_EVENT, (p) => {
        log(ChatEventEnum.CHAT_DELETED_EVENT, p);
        chat.deleteChatSocket?.(p);
    });

    /* -----------------------
       GROUP
    ------------------------*/
    socket.on(ChatEventEnum.UPDATE_GROUP_NAME_EVENT, (p) => {
        log(ChatEventEnum.UPDATE_GROUP_NAME_EVENT, p);
        chat.updateGroupInfoSocket?.(p);
    });

    socket.on(ChatEventEnum.UPDATE_GROUP_AVATAR_EVENT, (p) => {
        log(ChatEventEnum.UPDATE_GROUP_AVATAR_EVENT, p);
        chat.updateGroupAvatarSocket?.(p);
    });

    socket.on(ChatEventEnum.GROUP_MEMBER_ADDED_EVENT, (p) => {
        log(ChatEventEnum.GROUP_MEMBER_ADDED_EVENT, p);
        chat.groupMemberAddedSocket?.(p);
    });

    socket.on(ChatEventEnum.GROUP_MEMBER_REMOVED_EVENT, (p) => {
        log(ChatEventEnum.GROUP_MEMBER_REMOVED_EVENT, p);
        chat.groupMemberRemovedSocket?.(p);
    });

    socket.on(ChatEventEnum.MEMBER_PROMOTED_EVENT, (p) => {
        chat.updateGroupInfoSocket?.(p.chat);
    });

    socket.on(ChatEventEnum.MEMBER_DEMOTED_EVENT, (p) => {
        chat.updateGroupInfoSocket?.(p.chat);
    });

    /* -----------------------
       TYPING / PRESENCE (chat room)
    ------------------------*/
    socket.on(ChatEventEnum.TYPING_EVENT, (p) => {
        log(ChatEventEnum.TYPING_EVENT, p);

        const senderId = p?.userId;
        const { isUserBlocked } = useBlockStore.getState();
        if (isUserBlocked(senderId)) return;
        // p: { chatId, userId, timestamp }
        if (p?.chatId && p?.userId) {
            useChatStore.getState().setTyping(p.chatId, String(p.userId), true);
        }
    });

    socket.on(ChatEventEnum.STOP_TYPING_EVENT, (p) => {
        log(ChatEventEnum.STOP_TYPING_EVENT, p);
        if (p?.chatId && p?.userId) {
            useChatStore.getState().setTyping(p.chatId, String(p.userId), false);
        }
    });

    /* -----------------------
       USER / PROFILE 
    ------------------------*/
    socket.on(ChatEventEnum.USER_PROFILE_UPDATED, (p) => {
        log(ChatEventEnum.USER_PROFILE_UPDATED, p);
        useProfileStore.getState().updateProfileSocket?.(p);
    });

    socket.on(ChatEventEnum.USER_AVATAR_UPDATED, (p) => {
        log(ChatEventEnum.USER_AVATAR_UPDATED, p);
        useProfileStore.getState().updateAvatarSocket?.(p);
    });

    socket.on(ChatEventEnum.USER_STATUS_UPDATED, (p) => {
        log(ChatEventEnum.USER_STATUS_UPDATED, p);

        const senderId = p?.userId;
        const { isUserBlocked } = useBlockStore.getState();
        if (isUserBlocked(senderId)) return;

        useProfileStore.getState().updateOnlineStatusSocket?.(p);
        // update chats too
        useChatStore.getState().setUserOnlineStatus?.(p.userId, !!p.isOnline, p.lastSeen);
    });

    socket.on(ChatEventEnum.USER_ONLINE_EVENT, (p) => {
        log(ChatEventEnum.USER_ONLINE_EVENT, p);
        useChatStore.getState().setUserOnlineStatus?.(p.userId, true, null);
        useProfileStore.getState().updateOnlineStatusSocket?.({ userId: p.userId, isOnline: true, lastSeen: null });
    });

    socket.on(ChatEventEnum.USER_OFFLINE_EVENT, (p) => {
        log(ChatEventEnum.USER_OFFLINE_EVENT, p);
        useChatStore.getState().setUserOnlineStatus?.(p.userId, false, p.lastSeen || p.timestamp);
        useProfileStore.getState().updateOnlineStatusSocket?.({ userId: p.userId, isOnline: false, lastSeen: p.lastSeen || p.timestamp });
    });

    socket.on(ChatEventEnum.USER_DELETED_EVENT, (p) => {
        console.log("[socket] USER_DELETED_EVENT", p);

        useProfileStore.getState().markUserDeactivatedSocket(p);
        useChatStore.getState().markUserDeactivatedInChats(p.userId);
    });

    socket.on(ChatEventEnum.USER_REACTIVATED_EVENT, (p) => {
        console.log("[socket] USER_REACTIVATED_EVENT", p);

        useProfileStore.getState().markUserReactivatedSocket(p);
        useChatStore.getState().markUserReactivatedInChats(p.userId);
    });

    socket.on(ChatEventEnum.USER_ROLE_UPDATED, (p) => {
        const { userId, isAdmin } = p || {};
        if (!userId) return;

        const authStore = useAuthStore.getState();
        const currentUser = authStore.user;

        if (currentUser && String(currentUser._id) === String(userId)) {
            authStore.setUser({
                ...currentUser,
                isAdmin: !!isAdmin,
            });
        }
    });


    /* -----------------------
        BLOCKED
    ------------------------*/
    socket.on("BLOCK_LIST_UPDATED", async () => {
        const blockStore = useBlockStore.getState();
        const chatStore = useChatStore.getState();

        await blockStore.onBlockListUpdatedSocket();

        const { blockedUsers, blockedChats } = useBlockStore.getState();

        chatStore.syncBlockedStateToChats?.(blockedUsers, blockedChats);
    });


    socket.on("YOU_WERE_BLOCKED", ({ by }) => {
        console.log("[socket] YOU_WERE_BLOCKED by", by);

        const chatStore = useChatStore.getState();

        // update ALL chats with that user
        chatStore.markUserAsBlockedByOther?.(by);
    });


    socket.on("YOU_WERE_UNBLOCKED", ({ by }) => {
        console.log("[socket] YOU_WERE_UNBLOCKED by", by);

        const chatStore = useChatStore.getState();

        chatStore.markUserAsUnblockedByOther?.(by);
    });





    /* -----------------------
        DEVICE
    ------------------------*/

    socket.on(ChatEventEnum.DEVICE_REGISTERED_EVENT, (p) => {
        log(ChatEventEnum.DEVICE_REGISTERED_EVENT, p);
        useDeviceStore.getState().onDeviceRegistered?.(p);
    });

    socket.on(ChatEventEnum.DEVICE_LOGGED_OUT_EVENT, (p) => {
        log(ChatEventEnum.DEVICE_LOGGED_OUT_EVENT, p);
        useDeviceStore.getState().onDeviceLoggedOut?.(p);
        const auth = useAuthStore.getState();
        if (String(p.deviceId) === String(auth.deviceId)) {
            auth.logout();
            toast.error("You were logged out from this device");
        }
    });

    socket.on(ChatEventEnum.DEVICE_REMOVED_EVENT, (p) => {
        log(ChatEventEnum.DEVICE_REMOVED_EVENT, p);
        useDeviceStore.getState().onDeviceRemoved?.(p);
    });

    socket.on(ChatEventEnum.DEVICE_PRIMARY_CHANGED_EVENT, (p) => {
        log(ChatEventEnum.DEVICE_PRIMARY_CHANGED_EVENT, p);
        useDeviceStore.getState().onDevicePrimaryChanged?.(p);
    });

    socket.on(ChatEventEnum.DEVICE_KEYS_ROTATED_EVENT, (p) => {
        log(ChatEventEnum.DEVICE_KEYS_ROTATED_EVENT, p);
        useDeviceStore.getState().onDeviceKeysRotated?.(p);
    });

    socket.on(ChatEventEnum.DEVICE_DISCONNECTED_EVENT, (p) => {
        log(ChatEventEnum.DEVICE_DISCONNECTED_EVENT, p);
        useDeviceStore.getState().onDeviceDisconnected?.(p);
    });

    /* -----------------------
       CALLS
    ------------------------*/
    socket.on(ChatEventEnum.CALL_RINGING_EVENT, (p) => {
        log(ChatEventEnum.CALL_RINGING_EVENT, p);
        useCallStore.getState().onCallRinging?.(p);
    });

    socket.on(ChatEventEnum.CALL_ACCEPTED_EVENT, (p) => {
        log(ChatEventEnum.CALL_ACCEPTED_EVENT, p);
        useCallStore.getState().onCallAccepted?.(p);
    });

    socket.on(ChatEventEnum.CALL_REJECTED_EVENT, (p) => {
        log(ChatEventEnum.CALL_REJECTED_EVENT, p);
        useCallStore.getState().onCallRejected?.(p);
    });

    socket.on(ChatEventEnum.CALL_ENDED_EVENT, (p) => {
        log(ChatEventEnum.CALL_ENDED_EVENT, p);
        useCallStore.getState().onCallEnded?.(p);
    });

    socket.on(ChatEventEnum.CALL_MISSED_EVENT, (p) => {
        log(ChatEventEnum.CALL_MISSED_EVENT, p);
        useCallStore.getState().onCallMissed?.(p);
    });

    // return a detach function if caller wants to remove handlers
    return () => detachSocketHandlers(socket);
}

/**
 * Remove listeners for all known events (use on logout or hot reload)
 */
export function detachSocketHandlers(socket) {
    if (!socket) return;
    const events = Object.values(ChatEventEnum);
    events.forEach((evt) => {
        socket.off(evt);
    });
    // also remove generic 'connect' handlers if needed
    socket.off("connect");
    socket.off("disconnect");
    socket.off("user_connected");
    console.log("[socket] detached all handlers");
}

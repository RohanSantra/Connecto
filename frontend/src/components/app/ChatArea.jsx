// src/components/chat/ChatArea.jsx
import { useEffect, useMemo, useCallback } from "react";

import { useChatStore } from "@/store/useChatStore";
import { useMessageStore } from "@/store/useMessageStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useUIStore } from "@/store/useUIStore";

import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

import { getSocket, joinChat, leaveChat } from "@/lib/socket";
import api from "@/api/axios";

import PinnedMessagesBar from "@/components/chat/PinnedMessagesBar";
import MessageList from "@/components/chat/MessageList";
import MessageComposer from "@/components/chat/MessageComposer";
import MediaDocsOverlay from "@/components/chat/MediaDocsOverlay";
import ChatMenuDropdown from "@/components/chat/ChatMenuDropdown.jsx";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, Video, Info, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { formatDistanceToNowStrict } from "date-fns";
import { ChatEventEnum } from "@/constants";
import { useBlockStore } from "@/store/useBlockStore";
import BlockBanner from "@/components/chat/BlockBanner";
import { CallButton } from "../calls/CallButton";
import ChatAreaSkeleton from "../Skeleton/ChatAreaSkeleton";

export default function ChatArea() {
  const {
    activeChatId,
    activeChat,
    fetchChatDetails,
    typing,
    setActiveChatId,
    loadingActiveChat
  } = useChatStore();

  const {
    messages,
    fetchMessages,
    pinnedMessages,
    refreshPinnedMessages,
    currentPage,
    hasMore,
  } = useMessageStore();

  const { profile } = useProfileStore();
  const {
    openSidebarView,
    openDetailsPanel,
    openDetailsView,
    mediaDocsOpen,
    closeMediaDocs,
  } = useUIStore();

  const { isMobile } = useResponsiveDrawer();

  const { isUserBlocked, isChatBlocked } = useBlockStore();


  useKeyboardShortcuts({
    onCloseChat: () => {
      setActiveChatId(null);
      openSidebarView();
    },
  });

  /* ---------------- FETCH CHAT ---------------- */
  useEffect(() => {
    if (!activeChatId) return;
    fetchChatDetails(activeChatId);
    fetchMessages(activeChatId, 1);          // first page
    refreshPinnedMessages(activeChatId);
  }, [activeChatId]);

  /* ---------------- SOCKET JOIN ---------------- */
  useEffect(() => {
    if (!activeChatId) return;
    const socket = getSocket();
    if (!socket) return;
    joinChat(activeChatId);
    return () => leaveChat(activeChatId);
  }, [activeChatId]);

  /* ---------------- OLDER MESSAGE FETCHER (🔥 IMPORTANT) ---------------- */
  const fetchOlder = useCallback(
    async (nextPage) => {
      if (!activeChatId) return;
      await fetchMessages(activeChatId, nextPage);
    },
    [activeChatId, fetchMessages]
  );

  /* ---------------- PARTICIPANTS ---------------- */
  const participants = useMemo(() => {
    if (!activeChat) return [];
    return (activeChat.participants || []).map((p) => ({
      userId: p.userId,
      role: p.role,
      lastSeenAt: p.lastSeenAt || p.lastSeen || null,
      username: p.username || null,
      avatarUrl: p.avatarUrl || null,
      isOnline: !!p.isOnline,
    }));
  }, [activeChat]);

  const otherUser = useMemo(() => {
    if (!activeChat || activeChat.isGroup) return null;
    return participants.find((u) => String(u.userId) !== String(profile.userId));
  }, [activeChat, participants, profile]);

  const chatBlocked = isChatBlocked(activeChatId);
  const userBlocked =
    otherUser &&
    (
      isUserBlocked(otherUser.userId) ||
      activeChat?.otherUserBlockedMe
    );

  const isRestricted = chatBlocked || userBlocked;

  const shouldHideComposer = chatBlocked || userBlocked;

  /* ---------------- AUTO READ (SAFE) ---------------- */
  useEffect(() => {
    if (!activeChatId || isRestricted) return;   // 🚫 STOP when blocked

    const el = document.getElementById("msg-end");
    if (!el) return;

    let isProcessing = false; // prevents rapid fire

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || isProcessing) return;

      isProcessing = true;

      const socket = getSocket();
      const lastMsgId = activeChat?.lastMessage?._id
        ? String(activeChat.lastMessage._id)
        : null;

      try {
        if (socket) {
          socket.emit(ChatEventEnum.MESSAGE_READ_EVENT, {
            chatId: activeChatId,
            readUpToId: lastMsgId || undefined,
          });
        }

        await api.patch(
          `/messages/${activeChatId}/read`,
          lastMsgId ? { readUpToId: lastMsgId } : {},
          { withCredentials: true }
        );
      } catch {
        // silent — no console spam
      }

      setTimeout(() => (isProcessing = false), 1500); // throttle
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeChatId, activeChat?.lastMessage?._id, isRestricted]);


  const chatName = activeChat?.isGroup
    ? activeChat?.name
    : otherUser?.username || "User";

  const chatAvatar = activeChat?.isGroup
    ? activeChat?.groupAvatarUrl
    : otherUser?.avatarUrl;

  const isTyping = useMemo(() => {
    if (!activeChat) return false;
    const map = typing?.[activeChatId] || {};
    return activeChat.isGroup
      ? Object.keys(map).length > 0
      : map[otherUser?.userId];
  }, [typing, activeChatId, activeChat, otherUser]);

  const typingText = activeChat?.isGroup
    ? "Someone is typing…"
    : "typing…";

  const statusText = useMemo(() => {
    if (activeChat?.isGroup) return `${participants.length} members`;
    if (!otherUser) return "";
    if (otherUser.isOnline) return "Online";
    if (!otherUser.lastSeenAt) return "Offline";
    return `last seen ${formatDistanceToNowStrict(
      new Date(otherUser.lastSeenAt)
    )} ago`;
  }, [otherUser, participants]);

  if (loadingActiveChat) {
    return <ChatAreaSkeleton />;
  }

  if (!activeChat) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium mb-2">No chat selected</p>
        <p className="text-sm">Select a chat from the sidebar</p>
      </div>
    );
  }

  const closeChat = () => {
    setActiveChatId(null);
    openSidebarView();
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between gap-1.5 px-3 sm:px-4 py-3 border-b bg-card">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Back Button (visible on mobile only) */}
          <Button
            variant="outline"
            size={isMobile ? "xs" : "icon"}
            onClick={closeChat}
            className="shrink-0"
          >
            <ArrowLeft className={isMobile ? "size-3" : "size-5"} />
          </Button>

          {/* Avatar */}
          <Avatar
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 ${isRestricted ? "opacity-60 grayscale" : ""
              }`}
          >
            <AvatarImage src={chatAvatar} />
            <AvatarFallback className="rounded-xl">
              {chatName?.[0]}
            </AvatarFallback>
          </Avatar>

          {/* Name + Status */}
          <div className="flex flex-col min-w-0">
            <p className="font-medium text-sm sm:text-[15px]">
              {chatName}
            </p>

            <p className="text-xs text-muted-foreground">
              {isRestricted ? (
                <span className="text-destructive font-medium">
                  Messaging disabled
                </span>
              ) : isTyping ? (
                <span className="text-primary font-medium">
                  {typingText}
                </span>
              ) : (
                statusText
              )}
            </p>
          </div>
        </div>

        {/* RIGHT SIDE ACTIONS */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          <CallButton
            chatId={activeChatId}
            isGroup={activeChat?.isGroup}
            members={participants}
            disabled={isRestricted}
          />

          <div className="bg-border shrink-0 h-6 w-[1px] hidden sm:block" />

          <Button
            size="icon"
            variant="outline"
            className={isMobile ? "hidden" : "flex"}
            onClick={() =>
              isMobile ? openDetailsView() : openDetailsPanel()
            }
          >
            <Info className="w-5 h-5" />
          </Button>

          <ChatMenuDropdown />
        </div>
      </div>

      <Separator />

      {/* ================= PINNED ================= */}
      <PinnedMessagesBar pinnedMessages={pinnedMessages} />

      {/* ================= MESSAGE LIST ================= */}
      <div className="flex-1 overflow-hidden relative">

        {getSocket() == null ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={profile.userId}
            fetchOlderMessages={fetchOlder}
            hasMore={hasMore}
            page={currentPage}
          />
        )}
      </div>

      {/* ================= COMPOSER ================= */}
      <div className="border-t bg-card px-2 sm:px-3 py-2">

        {shouldHideComposer ? (
          <BlockBanner
            chatBlocked={chatBlocked}
            userBlocked={isUserBlocked(otherUser?.userId)}
            blockedByOther={activeChat?.otherUserBlockedMe}
            chatId={activeChatId}
            userId={otherUser?.userId}
          />
        ) : (
          <MessageComposer chatId={activeChatId} />
        )}
      </div>

      {/* ================= MEDIA OVERLAY ================= */}
      {mediaDocsOpen && (
        <MediaDocsOverlay
          chatId={activeChatId}
          onClose={closeMediaDocs}
        />
      )}
    </div>
  );
}

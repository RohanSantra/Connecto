// src/components/chat/ChatArea.jsx
import { useEffect, useMemo } from "react";

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
import ChatMenuDropdown from "@/components/chat/ChatMenuDropdown";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, Video, Info, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { formatDistanceToNowStrict } from "date-fns";
import { ChatEventEnum } from "@/constants";

export default function ChatArea() {
  const {
    activeChatId,
    activeChat,
    fetchChatDetails,
    typing,
    setActiveChatId,
  } = useChatStore();

  const {
    messages,
    fetchMessages,
    pinnedMessages,
    refreshPinnedMessages,
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

  useKeyboardShortcuts({
    onCloseChat: () => {
      setActiveChatId(null);
      openSidebarView();
    },
  });

  useEffect(() => {
    if (!activeChatId) return;

    fetchChatDetails(activeChatId);
    fetchMessages(activeChatId, 1);
    refreshPinnedMessages(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;
    const socket = getSocket();
    if (!socket) return;

    joinChat(activeChatId);
    return () => leaveChat(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;

    const el = document.getElementById("msg-end");
    if (!el) return;

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;

      const socket = getSocket();
      const lastMsgId = activeChat?.lastMessage?._id ? String(activeChat.lastMessage._id) : null;

      if (socket) {
        socket.emit(ChatEventEnum.MESSAGE_READ_EVENT, {
          chatId: activeChatId,
          readUpToId: lastMsgId || undefined,
        });
      }

      try {
        await api.patch(
          `/messages/${activeChatId}/read`,
          lastMsgId ? { readUpToId: lastMsgId } : {},
          { withCredentials: true }
        );
      } catch (err) {
        console.warn("read patch failed:", err?.message);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeChatId, messages, activeChat]);

  /* ------------------------------ PARTICIPANTS (use participants) ------------------------------ */
  const participants = useMemo(() => {
    if (!activeChat) return [];
    // activeChat.participants should already be normalized with username/avatar
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

  const chatName = activeChat?.isGroup ? activeChat?.name : otherUser?.username || "User";
  const chatAvatar = activeChat?.isGroup ? activeChat?.groupAvatarUrl : otherUser?.avatarUrl;

  const isTyping = useMemo(() => {
    if (!activeChat) return false;
    const map = typing?.[activeChatId] || {};
    return activeChat.isGroup ? Object.keys(map).length > 0 : map[otherUser?.userId];
  }, [typing, activeChatId, activeChat, otherUser]);

  const typingText = activeChat?.isGroup ? "Someone is typing…" : "typing…";

  const statusText = useMemo(() => {
    if (activeChat?.isGroup) return `${participants.length} members`;
    if (!otherUser) return "";
    if (otherUser.isOnline) return "Online";
    if (!otherUser.lastSeenAt) return "Offline";

    return `last seen ${formatDistanceToNowStrict(new Date(otherUser.lastSeenAt))} ago`;
  }, [otherUser, participants]);

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
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={closeChat}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          <Avatar className="w-10 h-10">
            <AvatarImage src={chatAvatar} />
            <AvatarFallback>{chatName?.[0]}</AvatarFallback>
          </Avatar>

          <div className="leading-tight">
            <p className="font-medium text-[15px]">{chatName}</p>

            <p className="text-xs text-muted-foreground">
              {isTyping ? <span className="text-primary font-medium">{typingText}</span> : statusText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled>
            <Phone className="w-4 h-4 opacity-40" />
          </Button>
          <Button variant="outline" size="icon" disabled>
            <Video className="w-4 h-4 opacity-40" />
          </Button>

          <Button
            onClick={() => (isMobile ? openDetailsView() : openDetailsPanel())}
          >
            <Info className="w-4 h-4" />
          </Button>

          <ChatMenuDropdown />
        </div>
      </div>

      <Separator />

      <PinnedMessagesBar pinnedMessages={pinnedMessages} />

      <div className="flex-1 overflow-hidden">
        {getSocket() == null ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={profile.userId} />
        )}
      </div>

      <div className="border-t bg-card">
        <MessageComposer chatId={activeChatId} />
      </div>

      {mediaDocsOpen && <MediaDocsOverlay chatId={activeChatId} onClose={closeMediaDocs} />}
    </div>
  );
}

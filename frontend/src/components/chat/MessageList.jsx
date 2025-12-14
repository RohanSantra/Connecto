import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import MessageItem from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isToday, isYesterday, format } from "date-fns";
import { motion } from "framer-motion";
import { useMessageStore } from "@/store/useMessageStore";

/* Format day headers */
function formatDay(date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd MMM yyyy");
}

/**
 * NOTE: virtualization-ready
 * - The component keeps structure compatible with windowing libraries.
 * - If you later plug react-window/virtuoso, replace the inner map rendering.
 */
export default function MessageList({
  messages = [],
  currentUserId,
  unreadMessageId = null,
  fetchOlderMessages,
  hasMore = false,
  page = 1,
  typingUsers = [],
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const { scrollToMessageId, setScrollToMessage } = useMessageStore();


  const [loadingOlder, setLoadingOlder] = useState(false);
  const [localPage, setLocalPage] = useState(page);
  const [userScrollingUp, setUserScrollingUp] = useState(false);

  const msgCount = messages.length;

  /* Group messages by day (memoized) */
  const grouped = useMemo(() => {
    const map = {};
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const d = new Date(m.createdAt);
      const key = formatDay(d);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [messages]);

  /* Auto-scroll when new messages arrive (only if user near bottom) */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (!userScrollingUp && atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgCount, userScrollingUp]);

  // Scroll to reply message 
  useEffect(() => {
    if (!scrollToMessageId) return;

    const el = document.getElementById(`msg-${scrollToMessageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      el.classList.add(
        "bg-primary/10",
        "rounded-md",
        "animate-[pulse_1s_ease-out_1]"
      );

      setTimeout(() => {
        el.classList.add("animate-[bounce_400ms_ease-out_1]");
      }, 200);

      setTimeout(() => {
        el.classList.remove(
          "bg-primary/10",
          "animate-[pulse_1s_ease-out_1]",
          "animate-[bounce_400ms_ease-out_1]"
        );
      }, 1400);
    }

    // clear trigger
    setScrollToMessage(null);
  }, [scrollToMessageId]);

  /* Infinite scroll (load older) with height preservation */
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || loadingOlder || !hasMore) return;

    const nearTop = el.scrollTop <= 120;
    setUserScrollingUp(el.scrollTop < el.scrollHeight - el.clientHeight - 250);

    if (nearTop) {
      const prevHeight = el.scrollHeight;
      const prevTop = el.scrollTop;
      try {
        setLoadingOlder(true);
        const nextPage = localPage + 1;
        if (typeof fetchOlderMessages === "function") {
          await fetchOlderMessages(nextPage);
          setLocalPage(nextPage);
        }
      } catch (err) {
        console.warn("Failed fetching older messages:", err);
      } finally {
        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
          el.scrollTop = newHeight - prevHeight + prevTop;
          setLoadingOlder(false);
        });
      }
    }
  }, [loadingOlder, hasMore, localPage, fetchOlderMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground select-none px-6">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs">Start the conversation 👋</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="h-full px-4 py-3 overflow-y-auto">
      <div className="flex flex-col gap-6">
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <span className="text-xs text-muted-foreground">Loading older messages…</span>
          </div>
        )}

        {Object.entries(grouped).map(([day, msgs]) => (
          <div key={day} className="space-y-3">
            <div className="flex justify-center select-none">
              <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">{day}</span>
            </div>

            <div className="flex flex-col gap-3">
              {msgs.map((m) => (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.14 }}
                >
                  {unreadMessageId === m._id && (
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-muted" />
                      <span className="text-xs font-semibold">Unread messages</span>
                      <div className="flex-1 h-px bg-muted" />
                    </div>
                  )}

                  <MessageItem
                    message={m}
                    isOwn={
                      String(
                        m.senderId?.userId ||
                        m.senderId?._id ||
                        m.senderProfile?.userId ||
                        m.senderProfile?._id ||
                        m.senderId ||
                        ""
                      ) === String(currentUserId)
                    }
                  />
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {typingUsers?.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce delay-100" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce delay-200" />
            </span>
            {typingUsers.length === 1
              ? `${typingUsers[0].username || "Someone"} is typing…`
              : "Multiple people are typing…"}
          </div>
        )}

        <div ref={bottomRef} id="msg-end" className="h-1" />
      </div>
    </ScrollArea>
  );
}

"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import MessageItem from "./MessageItem";
import { isToday, isYesterday, format } from "date-fns";
import { motion } from "framer-motion";
import { useMessageStore } from "@/store/useMessageStore";
import MessageItemSkeleton from "../Skeleton/MessageItemSkeleton";
import MessageListSkeleton from "../Skeleton/MessageListSkeleton";
import { useChatStore } from "@/store/useChatStore";

function formatDay(date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd MMM yyyy");
}

export default function MessageList({
  messages = [],
  currentUserId,
  unreadMessageId = null,
  fetchOlderMessages,
  hasMore = false,
  page = 1,
  typingUsers = [],
}) {
  const { activeChat } = useChatStore();
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // track previous first/last ids so we can detect prepend vs append
  const prevFirstIdRef = useRef(messages?.[0]?._id || null);
  const prevLastIdRef = useRef(messages?.[messages.length - 1]?._id || null);

  const { scrollToMessageId, setScrollToMessage, loadingInitial } = useMessageStore();

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [localPage, setLocalPage] = useState(page);
  const isGroup = activeChat.isGroup;


  // helpers to prevent too-frequent fetch and mark fetching
  const fetchingOlderRef = useRef(false);
  const lastFetchTsRef = useRef(0);

  useEffect(() => setLocalPage(page), [page]);
  const firstMsgId = messages?.[0]?._id || null;

  useEffect(() => {
    // Chat changed
    initialLoadRef.current = true;
    prevFirstIdRef.current = null;
    prevLastIdRef.current = null;
    setLocalPage(page);

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [activeChat?._id]);

  /* ---------------- Group by day ---------------- */
  const grouped = useMemo(() => {
    const map = {};
    messages.forEach((m) => {
      const key = formatDay(new Date(m.createdAt));
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [messages]);

  /* ---------------- SCROLL TO BOTTOM WHEN CHAT OPENS ---------------- */
  const initialLoadRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (initialLoadRef.current && messages.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "auto" });
        });
      });
      initialLoadRef.current = false;
    }
  }, [messages.length]);

  /* ---------------- AUTO SCROLL FOR NEW APPENDED MESSAGES ONLY ---------------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const lastMessage = messages?.[messages.length - 1];
    if (!lastMessage) return;

    const prevLast = prevLastIdRef.current;
    prevLastIdRef.current = lastMessage._id;

    if (!prevLast) return;

    const appended = prevLast !== lastMessage._id;
    if (!appended) return;

    const isOwn =
      String(lastMessage.senderId?.userId || lastMessage.senderId) ===
      String(currentUserId);

    // ✅ ALWAYS scroll for your own message
    if (isOwn) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }

    // Only auto-scroll for others if near bottom
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    const isNearBottom = distanceFromBottom < 150;

    if (isNearBottom) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }

  }, [messages, currentUserId]);

  /* ---------------- Scroll to reply target ---------------- */
  useEffect(() => {
    if (!scrollToMessageId) return;
    const el = document.getElementById(`msg-${scrollToMessageId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToMessage(null);
  }, [scrollToMessageId, setScrollToMessage]);

  /* ---------------- Infinite Scroll (trigger at upper half) ---------------- */
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || loadingOlder || !hasMore) return;

    // 🔥 Only trigger when near top
    if (el.scrollTop > 120) return;

    if (fetchingOlderRef.current) return;

    fetchingOlderRef.current = true;
    setLoadingOlder(true);

    const prevHeight = el.scrollHeight;

    try {
      const nextPage = localPage + 1;
      await fetchOlderMessages(nextPage);
      setLocalPage(nextPage);

      requestAnimationFrame(() => {
        const newHeight = el.scrollHeight;
        el.scrollTop = newHeight - prevHeight;
      });

    } catch (err) {
      console.warn("Older fetch failed", err);
    } finally {
      setLoadingOlder(false);
      fetchingOlderRef.current = false;
    }
  }, [localPage, hasMore, loadingOlder, fetchOlderMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const listener = (ev) => handleScroll(ev);
    el.addEventListener("scroll", listener, { passive: true });
    return () => el.removeEventListener("scroll", listener);
  }, [handleScroll]);

  /* If content is shorter than viewport and we have more, fetch older (fill) */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight && hasMore && !loadingOlder && !fetchingOlderRef.current) {
      handleScroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, hasMore]);


  if (loadingInitial) {
    return (
      <div className="h-full px-4 py-3 flex flex-col gap-3">
        <MessageListSkeleton initialCount={6} showGroup={isGroup} />
      </div>
    );
  }

  if (!loadingInitial && messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs mt-1">Start the conversation 👋</p>
      </div>
    );
  }


  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-3 py-2 scroll-thumb-only"
    >
      {/* Loading older skeleton */}
      {loadingOlder && (
        <div className="space-y-3 py-2">
          <MessageItemSkeleton variant="other" isGroup={isGroup} />
        </div>
      )}

      {Object.entries(grouped).map(([day, msgs]) => (
        <div key={day} className="space-y-3">
          <div className="flex justify-center">
            <span className="text-xs bg-muted px-3 py-1 rounded-full">
              {day}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {msgs.map((m) => (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
              >
                {unreadMessageId === m._id && (
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-muted" />
                    <span className="text-xs font-semibold">
                      Unread messages
                    </span>
                    <div className="flex-1 h-px bg-muted" />
                  </div>
                )}

                <MessageItem
                  message={m}
                  isOwn={
                    String(m.senderId?.userId || m.senderId) ===
                    String(currentUserId)
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {typingUsers?.length > 0 && (
        <div className="text-xs text-muted-foreground mt-2">
          Someone is typing…
        </div>
      )}

      <div ref={bottomRef} id="msg-end" className="h-1" />
    </div>
  );
}

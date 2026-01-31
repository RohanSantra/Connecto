"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import MessageItem from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const { scrollToMessageId, setScrollToMessage } = useMessageStore();

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [localPage, setLocalPage] = useState(page);
  const isGroup = activeChat.isGroup;


  // helpers to prevent too-frequent fetch and mark fetching
  const fetchingOlderRef = useRef(false);
  const lastFetchTsRef = useRef(0);

  useEffect(() => setLocalPage(page), [page]);
  const firstMsgId = messages?.[0]?._id || null;

  useEffect(() => {
    // Chat changed → reset scroll system
    initialLoadRef.current = true;
    prevFirstIdRef.current = null;
    prevLastIdRef.current = null;
    setLocalPage(page);

    // also force scroll container to bottom after next paint
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [firstMsgId]);

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

    const newFirst = messages?.[0]?._id || null;
    const newLast = messages?.[messages.length - 1]?._id || null;

    const prevFirst = prevFirstIdRef.current;
    const prevLast = prevLastIdRef.current;

    const prepended = prevFirst && newFirst && prevFirst !== newFirst;
    const appended = prevLast && newLast && prevLast !== newLast;

    prevFirstIdRef.current = newFirst;
    prevLastIdRef.current = newLast;

    if (prepended) return;

    if (appended) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  /* ---------------- Scroll to reply target ---------------- */
  useEffect(() => {
    if (!scrollToMessageId) return;
    const el = document.getElementById(`msg-${scrollToMessageId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToMessage(null);
  }, [scrollToMessageId, setScrollToMessage]);

  /* ---------------- Infinite Scroll (trigger at upper half) ---------------- */
  const handleScroll = useCallback(
    async (e) => {
      const el = scrollRef.current;
      if (!el || loadingOlder || !hasMore) return;

      const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 1);
      const progress = el.scrollTop / maxScroll;
      const nearUpperHalf = progress <= 0.5;

      if (!nearUpperHalf) return;
      if (fetchingOlderRef.current) return;
      const now = Date.now();
      if (now - lastFetchTsRef.current < 700) return;
      lastFetchTsRef.current = now;

      const prevHeight = el.scrollHeight;
      const prevTop = el.scrollTop;

      try {
        fetchingOlderRef.current = true;
        setLoadingOlder(true);
        const nextPage = localPage + 1;
        await fetchOlderMessages(nextPage);
        setLocalPage(nextPage);

        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const newHeight = el.scrollHeight;
        el.scrollTop = Math.max(0, newHeight - prevHeight + prevTop);
      } catch (err) {
        console.warn("Failed fetching older messages:", err);
      } finally {
        setLoadingOlder(false);
        fetchingOlderRef.current = false;
      }
    },
    [loadingOlder, hasMore, localPage, fetchOlderMessages]
  );

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



  if (!messages.length) {
    // show a decent initial skeleton list (tweak count as needed)
    return (
      <div className="h-full px-4 py-3 flex flex-col gap-3 overflow-y-auto">
        <MessageListSkeleton initialCount={6} showGroup={isGroup} />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="h-full px-4 py-3">
        <div ref={scrollRef} className="h-full overflow-y-auto pr-2">
          {/* WHEN LOADING OLDER — show skeletons at the top so user knows more content is incoming */}
          {loadingOlder && (
            <div className="space-y-3 py-2">
              <MessageItemSkeleton variant="other" isGroup={isGroup} />
            </div>
          )}

          {Object.entries(grouped).map(([day, msgs]) => (
            <div key={day} className="space-y-3">
              <div className="flex justify-center">
                <span className="text-xs bg-muted px-3 py-1 rounded-full">{day}</span>
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
                        <span className="text-xs font-semibold">Unread messages</span>
                        <div className="flex-1 h-px bg-muted" />
                      </div>
                    )}

                    <MessageItem
                      message={m}
                      isOwn={String(m.senderId?.userId || m.senderId) === String(currentUserId)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

          {typingUsers?.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2">Someone is typing…</div>
          )}

          <div ref={bottomRef} id="msg-end" className="h-1" />
        </div>
      </div>
    </ScrollArea>
  );
}

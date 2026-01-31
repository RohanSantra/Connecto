"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useMessageStore } from "@/store/useMessageStore";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";

import { X as CloseIcon } from "lucide-react";

const formatDateTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso || "";
  }
};

export default function EmojiInfoPanel({ open, onClose, message }) {
  const fetchReactions = useMessageStore((s) => s.fetchReactions);

  const { isMobile } = useResponsiveDrawer();
  const drawerDirection = isMobile ? "bottom" : "right";

  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !message?._id) return;

    setLoading(true);
    fetchReactions(message._id)
      .then((res) => {
        setGroups(res || []);

        if (res && res.length > 1) {
          setActiveTab("all");
        } else if (res && res.length === 1) {
          setActiveTab(res[0].emoji);
        } else {
          setActiveTab(null);
        }
      })
      .catch(() => {
        setGroups([]);
        setActiveTab(null);
      })
      .finally(() => setLoading(false));
  }, [open, message?._id, fetchReactions]);

  const totalReactions = useMemo(
    () => groups.reduce((s, g) => s + (g.users?.length || 0), 0),
    [groups]
  );

  const emojiTabs = useMemo(
    () => groups.map((g) => ({ emoji: g.emoji, count: g.users?.length || 0 })),
    [groups]
  );

  const showAll = groups.length > 1;

  const getUsers = () => {
    if (!groups || groups.length === 0) return [];
    if (activeTab === "all") return groups.flatMap((g) => g.users || []);
    const g = groups.find((x) => x.emoji === activeTab);
    return (g && g.users) || [];
  };

  if (!open) return null;

  return (
    <Drawer direction={drawerDirection} open={open} onOpenChange={onClose}>
      <DrawerContent
        className={`bg-card border-t md:border-l rounded-none md:rounded-l-xl shadow-xl
          ${isMobile ? "h-[70vh]" : "w-[420px] h-full"}
        `}
      >
        {/* Header */}
        <DrawerHeader className="grid grid-cols-2 gap-2 items-center justify-between border-b px-4 py-3">
          <div>
            <DrawerTitle className="text-lg font-semibold">Reactions</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              See who reacted to this message —{" "}
              <span className="font-medium">{totalReactions}</span> total
            </p>
          </div>

          {/* CLOSE BUTTON RIGHT END */}
          <button
            aria-label="Close"
            onClick={() => onClose(false)}
            className="ml-auto inline-flex items-center justify-center rounded-md p-2 hover:bg-muted/50 transition"
          >
            <CloseIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </DrawerHeader>

        {/* Body */}
        <div className="p-4 overflow-y-auto h-full">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="flex flex-wrap gap-2 mb-4">
              {showAll && (
                <TabsTrigger
                  value="all"
                  className="px-3 py-1 rounded-full text-sm font-medium shadow-sm bg-muted/10"
                >
                  All{" "}
                  <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                    ({totalReactions})
                  </span>
                </TabsTrigger>
              )}

              {emojiTabs.map((t) => (
                <TabsTrigger
                  key={t.emoji}
                  value={t.emoji}
                  className="px-3 py-1 rounded-full text-sm font-medium shadow-sm bg-muted/10 flex items-center gap-2"
                >
                  <span className="text-[18px] leading-none">{t.emoji}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    ({t.count})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-muted-foreground/20" />
                      <div className="flex-1">
                        <div className="h-3 w-3/5 bg-muted-foreground/20 rounded mb-2" />
                        <div className="h-2 w-1/4 bg-muted-foreground/20 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : getUsers().length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No reactions to show.</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {getUsers().map((u) => (
                    <div
                      key={u.userId || u.id || u.username}
                      className="flex items-center gap-3 py-3"
                    >
                      <Avatar className="h-10 w-10">
                        {u.avatarUrl ? (
                          <AvatarImage src={u.avatarUrl} />
                        ) : (
                          <AvatarFallback>
                            {(u.username || "U")[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {u.username || u.displayName || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(u.reactedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

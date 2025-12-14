"use client";

import React, { useEffect, useState } from "react";
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

export default function EmojiInfoPanel({ open, onClose, message }) {
  const fetchReactions = useMessageStore((s) => s.fetchReactions);

  const { isMobile } = useResponsiveDrawer();
  const drawerDirection = isMobile ? "bottom" : "right";

  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);

  // fetch reactions
  useEffect(() => {
    if (!open || !message?._id) return;

    setLoading(true);
    fetchReactions(message._id).then((res) => {
      setGroups(res);

      // dynamic tabs: pick first emoji OR "all"
      if (res.length > 1) {
        setActiveTab("all");
      } else if (res.length === 1) {
        setActiveTab(res[0].emoji);
      }

      setLoading(false);
    });
  }, [open, message?._id]);

  // dynamic tab list
  const emojiTabs = groups.map((g) => g.emoji);

  // show All tab only if having more than 1 emoji
  const showAll = groups.length > 1;

  const getUsers = () => {
    if (activeTab === "all") return groups.flatMap((g) => g.users);
    return groups.find((g) => g.emoji === activeTab)?.users || [];
  };

  if (!open) return null;

  return (
    <Drawer direction={drawerDirection} open={open} onOpenChange={onClose}>
      <DrawerContent
        className={`bg-card border-t md:border-l rounded-none md:rounded-l-xl shadow-xl
          ${isMobile ? "h-[70vh]" : "w-[380px] h-full"}
        `}
      >
        <DrawerHeader className="border-b px-4 py-3">
          <DrawerTitle className="text-lg font-semibold">Reactions</DrawerTitle>
          <p className="text-sm text-muted-foreground">See who reacted to this message</p>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            <TabsList className={`grid ${showAll ? `grid-cols-${groups.length + 1}` : `grid-cols-${groups.length}`} mb-4`}>
              {showAll && (
                <TabsTrigger value="all">
                  All
                </TabsTrigger>
              )}

              {emojiTabs.map((emoji) => (
                <TabsTrigger key={emoji} value={emoji}>
                  {emoji}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Content */}
            <TabsContent value={activeTab}>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Loading…
                </p>
              ) : getUsers().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No reactions
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {getUsers().map((u) => (
                    <div key={u.userId} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback>{u.username?.[0] || "U"}</AvatarFallback>
                      </Avatar>

                      <div>
                        <p className="text-sm font-medium">{u.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(u.reactedAt).toLocaleString()}
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

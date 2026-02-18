"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function MessageItemSkeleton({
    variant = "other",
    isGroup = false,
    showAvatar,
    showMedia = false,
    compact = false,
}) {
    const isOwn = variant === "own";

    // show avatar for group and other messages by default; allow override via showAvatar
    const avatarVisible = typeof showAvatar === "boolean" ? showAvatar : (!isOwn && isGroup);

    const bubbleMaxWidth = "max-w-[78%]"; // matches your MessageItem limit
    const bubblePadding = compact ? "px-3 py-2" : "px-4 py-3";
    const nameHeight = "h-3.5 w-24 sm:w-28";
    const line1 = compact
        ? "h-3 w-3/4 sm:w-2/3"
        : "h-3 w-5/6 sm:w-3/4";

    const line2 = compact
        ? "h-3 w-1/2 sm:w-1/3"
        : "h-3 w-2/3 sm:w-1/2";

    return (
        <div
            className={cn(
                "flex mb-5 mx-2 items-end",
                isOwn ? "justify-end" : "justify-start"
            )}
            aria-hidden
        >
            {/* Avatar for other users (left) */}
            {!isOwn && avatarVisible && (
                <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-muted/60 animate-pulse border shadow-sm" />
                </div>
            )}

            <div className={`relative ${bubbleMaxWidth} group overflow-visible z-0`}>
                {/* pinned placeholder (optional) */}
                <div className="sr-only">pinned placeholder</div>

                {/* Name inside bubble for group + other */}
                {isGroup && !isOwn && (
                    <div className="mb-1">
                        <div className={`bg-muted rounded ${nameHeight} animate-pulse`} />
                    </div>
                )}

                {/* message bubble */}
                <div
                    className={cn(
                        "rounded-xl text-sm shadow-sm border",
                        isOwn ? "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)]" : "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)]",
                        bubblePadding,
                        "animate-pulse"
                    )}
                    style={{ maxWidth: "100%" }}
                >
                    <div className={cn("leading-relaxed")}>
                        <div className={`rounded h-3 ${line1} bg-muted`} />
                        <div className="mt-2">
                            <div className={`rounded h-3 ${line2} bg-muted`} />
                        </div>
                    </div>

                    {/* small reply preview skeleton (optional) */}
                    <div className="mt-3">
                        <div className="h-3 w-28 bg-muted rounded" />
                    </div>
                </div>

                {/* media skeletons (images / video) */}
                {showMedia && (
                    <div
                        className={cn(
                            "mt-3 flex gap-2",
                            isOwn ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className="w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] rounded-xl bg-muted animate-pulse" />
                        <div className="w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] rounded-xl bg-muted animate-pulse" />
                    </div>
                )}

                {/* time & tick row skeleton */}
                <div className={cn("flex items-center gap-2 mt-2", isOwn ? "justify-end" : "justify-start")}>
                    <div className="h-3 w-10 sm:w-12 bg-muted rounded" />
                    {isOwn && <div className="h-3 w-6 bg-muted rounded" />}
                </div>
            </div>

            {/* Avatar for own messages (optional on right) */}
            {isOwn && avatarVisible && (
                <div className="flex-shrink-0 ml-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted/60 animate-pulse border shadow-sm" />
                </div>
            )}
        </div>
    );
}

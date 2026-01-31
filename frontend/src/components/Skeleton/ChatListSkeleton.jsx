// src/components/chat/ChatListItemSkeleton.jsx
"use client";

import React from "react";

/**
 * ChatListItemSkeleton
 * - Matches ChatListItem: grid [48px | 1fr | auto]
 * - Responsive & consistent spacing across device sizes
 * - Props:
 *    compact: reduce padding / tighter spacing (use on mobile)
 *    showThumbnails: whether to render mini-attachment thumbnails area
 */

function AvatarSkeleton({ compact = false }) {
  const sizeClass = compact ? "h-9 w-9" : "h-11 w-11";
  return (
    <div className={`relative ${sizeClass} shrink-0`} aria-hidden>
      <div className={`rounded-xl bg-muted/60 border shadow-sm w-full h-full animate-pulse`} />
      {/* marker (pin / online) */}
      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted/80 border animate-pulse" />
    </div>
  );
}

function MiniThumbStripSkeleton() {
  return (
    <div className="flex -space-x-1.5 ml-1 shrink-0">
      <div className="h-4 w-4 rounded object-cover border bg-muted animate-pulse" />
      <div className="h-4 w-4 rounded object-cover border bg-muted animate-pulse" />
      <div className="h-4 w-4 rounded object-cover border bg-muted animate-pulse" />
    </div>
  );
}

function NameTimeSkeleton({ compact }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="h-3.5 bg-muted rounded w-1/2 sm:w-2/3 animate-pulse" />
        <div className="h-3 bg-muted rounded w-12 animate-pulse" />
      </div>
      <div className={compact ? "mt-1" : "mt-2"}>
        <div className="h-3 bg-muted rounded w-2/3 sm:w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

function RightColumnSkeleton() {
  return (
    <div className="relative flex items-start justify-end shrink-0 w-8">
      <div className="absolute -top-1 right-2 inline-flex min-w-5 h-5 px-1.5 rounded-full bg-muted animate-pulse" />
      <div className="absolute bottom-0 right-2 h-6 w-6 rounded-md bg-muted animate-pulse" />
    </div>
  );
}

/* Single chat row skeleton */
export function ChatListItemSkeleton({ compact = false, showThumbnails = true }) {
  const padding = compact ? "py-2 px-2" : "p-3";

  return (
    <div
      role="status"
      aria-hidden
      className={`w-full grid grid-cols-[48px_1fr_auto] gap-3 rounded-xl ${padding} transition-all`}
    >
      {/* Avatar */}
      <div className="relative">
        <AvatarSkeleton compact={compact} />
      </div>

      {/* Middle column */}
      <div className="min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="h-3.5 bg-muted rounded w-36 sm:w-48 animate-pulse" />
          </div>
          <div className="text-[11px] ml-2 text-muted-foreground whitespace-nowrap">
            <div className="h-3 bg-muted rounded w-10 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 min-w-0 overflow-hidden">
          {/* tick placeholder */}
          <div className="shrink-0 mr-0 w-4 h-4 rounded bg-muted animate-pulse" />

          {/* optional mini thumbs */}
          {showThumbnails && <MiniThumbStripSkeleton />}

          {/* preview */}
          <div className="text-xs text-muted-foreground truncate w-full block">
            <div className="h-3 bg-muted rounded w-full sm:w-9/12 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Right column */}
      <RightColumnSkeleton />
    </div>
  );
}

/* List wrapper: render multiple rows */
export default function ChatListSkeleton({
  count = 8,
  compact = false,
  showThumbnails = true,
}) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <ChatListItemSkeleton
          key={i}
          compact={compact}
          showThumbnails={showThumbnails}
        />
      ))}
    </div>
  );
}

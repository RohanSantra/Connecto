"use client";

import { Skeleton } from "@/components/ui/skeleton";
import MessageListSkeleton from "./MessageListSkeleton";
import { Separator } from "@/components/ui/separator";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";

export default function ChatAreaSkeleton() {
  const { isMobile } = useResponsiveDrawer();

  return (
    <div className="flex flex-col h-full w-full bg-background">

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between gap-1.5 px-3 sm:px-4 py-3 border-b bg-card">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Back button placeholder */}
          <Skeleton
            className={
              isMobile
                ? "h-7 w-7 rounded-md"
                : "h-9 w-9 rounded-md"
            }
          />

          {/* Avatar */}
          <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />

          {/* Name + status */}
          <div className="flex flex-col gap-2 min-w-0">
            <Skeleton className="h-4 w-28 sm:w-36" />
            <Skeleton className="h-3 w-20 sm:w-24" />
          </div>
        </div>

        {/* RIGHT SIDE ACTIONS */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Skeleton className="h-9 w-9 rounded-md" />
          {!isMobile && (
            <>
              <Skeleton className="h-6 w-[1px]" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </>
          )}
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      <Separator />

      {/* ================= PINNED BAR ================= */}
      {/* <div className="px-3 sm:px-4 py-2">
        <Skeleton className="h-8 w-40 rounded-full" />
      </div> */}

      {/* ================= MESSAGE LIST ================= */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full px-1 py-3">
          <MessageListSkeleton
            initialCount={6}
            showGroup={false}
          />
        </div>
      </div>

      {/* ================= COMPOSER ================= */}
      <div className="border-t bg-card px-2 sm:px-3 py-2">

        <div className="flex items-center gap-1 sm:gap-2">

          {/* Attach */}
          <Skeleton className="h-9 w-9 rounded-md" />

          {/* Mic */}
          <Skeleton className="h-9 w-9 rounded-md" />

          {/* Textarea */}
          <Skeleton className="flex-1 h-[38px] sm:h-[42px] rounded-lg" />

          {/* Emoji */}
          <Skeleton className="h-9 w-9 rounded-md" />

          {/* Send */}
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>

      </div>
    </div>
  );
}

"use client";
import React from "react";
import MessageItemSkeleton from "./MessageItemSkeleton";

export default function MessageListSkeleton({
    initialCount = 6,
    showGroup = false,
}) {
    const pattern = ["other", "own", "other", "own", "other"];

    return (
        <div className="h-full flex flex-col justify-end gap-3">
            {Array.from({ length: initialCount }).map((_, i) => (
                <MessageItemSkeleton
                    key={i}
                    variant={pattern[i % pattern.length]}
                    isGroup={showGroup}
                    showAvatar={pattern[i % pattern.length] === "other" && showGroup}
                    showMedia={i % 4 === 0}
                />
            ))}
        </div>
    );
}

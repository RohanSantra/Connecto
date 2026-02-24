"use client";

import { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBlockStore } from "@/store/useBlockStore";
import { toast } from "sonner";

export default function BlockBanner({
    chatBlocked,
    userBlocked,
    blockedByOther,
    chatId,
    userId,
}) {
    const { unblockChat, unblockUser } = useBlockStore();
    const [loading, setLoading] = useState(false);

    const handleUnblock = async () => {
        if (loading) return;

        const toastId = toast.loading(
            chatBlocked ? "Unblocking group..." : "Unblocking user..."
        );

        setLoading(true);

        try {
            if (chatBlocked) {
                await unblockChat(chatId);
            } else {
                await unblockUser(userId);
            }

            toast.success(
                chatBlocked
                    ? "The group has been unblocked"
                    : "The user has been unblocked",
                { id: toastId }
            );
        } catch (err) {
            toast.error(
                err?.message || "We couldn’t update the block status. Please try again.",
                { id: toastId }
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-muted/60 border-t">
            <div className="flex items-center gap-3 text-sm">
                <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />

                {chatBlocked && "You blocked this group. Messages are disabled."}
                {userBlocked && !blockedByOther &&
                    "You blocked this user. Messages are disabled."}
                {blockedByOther &&
                    "You have been blocked. Messaging is disabled."}
            </div>

            {(chatBlocked || (userBlocked && !blockedByOther)) && (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleUnblock}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        "Unblock"
                    )}
                </Button>
            )}
        </div>
    );
}
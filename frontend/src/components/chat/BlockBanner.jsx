import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBlockStore } from "@/store/useBlockStore";

export default function BlockBanner({ chatBlocked, userBlocked, blockedByOther, chatId, userId }) {
    const { unblockChat, unblockUser } = useBlockStore();

    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/60 border-t">
            <div className="flex items-center gap-3 text-sm">
                <ShieldAlert className="w-4 h-4 text-destructive" />

                {chatBlocked && "You blocked this group. Messages are disabled."}
                {userBlocked && !blockedByOther && "You blocked this user. Messages are disabled."}
                {blockedByOther && "You have been blocked. Messaging is disabled."}
            </div>

            {(chatBlocked || (userBlocked && !blockedByOther)) && (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => chatBlocked ? unblockChat(chatId) : unblockUser(userId)}
                >
                    Unblock
                </Button>
            )}
        </div>
    );
}

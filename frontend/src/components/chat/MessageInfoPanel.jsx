import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";
import { format } from "date-fns";

export default function MessageInfoPanel({ open, onClose, message }) {
    const { chats } = useChatStore();
    const { profile } = useProfileStore();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    if (!message) return null;

    const chat = chats.find((c) => String(c.chatId || c._id) === String(message.chatId));
    if (!chat) return null;

    const deliveredToRaw = Array.isArray(message.deliveredTo) ? message.deliveredTo : [];
    const deliveredTo = deliveredToRaw.filter(
        (x) => String(x.userId) !== String(profile.userId)
    );

    const readByRaw = Array.isArray(message.readBy) ? message.readBy : [];
    const readBy = readByRaw.filter(
        (x) => String(x.userId) !== String(profile.userId)
    );

    const fmt = (t) => (t ? format(new Date(t), "PPpp") : "—");

    const getMember = (userId) => {
        const uid = String(userId);
        return chat.participants?.find((p) => String(p.userId || p._id) === uid) || {};
    };

    const tidy = (entry) => ({
        userId: entry?.userId || entry?._id || null,
        at: entry?.deliveredAt || entry?.readAt || null,
    });

    return (
        <Sheet open={open} onOpenChange={(val) => !val && onClose(false)}>
            <SheetContent
                side={isMobile ? "bottom" : "right"}
                className={isMobile ? "h-[45vh] rounded-t-xl p-0" : "w-[360px] p-0"}
            >
                <SheetHeader className="px-5 py-4 border-b">
                    <SheetTitle>Message Info</SheetTitle>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)] p-5 space-y-6">

                    {/* Delivered Section */}
                    <section>
                        <h4 className="text-xs text-muted-foreground mb-2 font-medium">
                            Delivered To
                        </h4>

                        {deliveredTo.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No deliveries yet</p>
                        ) : (
                            deliveredTo.map((d) => {
                                const { userId, at } = tidy(d);
                                if (!userId) return null;

                                const m = getMember(userId);
                                const avatar =
                                    m.avatarUrl ||
                                    m.profileImage?.url ||
                                    m.profile?.avatarUrl ||
                                    null;

                                return (
                                    <div key={userId} className="flex items-center gap-3 mb-3">
                                        <Avatar className="w-9 h-9">
                                            <AvatarImage src={avatar} />
                                            <AvatarFallback>{m.username?.[0] || "?"}</AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <p className="font-medium">{m.username || "Unknown"}</p>
                                            <p className="text-xs text-muted-foreground">{fmt(at)}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </section>

                    {/* Read Section */}
                    <section>
                        <h4 className="text-xs text-muted-foreground mb-2 font-medium">
                            Read By
                        </h4>

                        {readBy.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No reads yet</p>
                        ) : (
                            readBy.map((d) => {
                                const { userId, at } = tidy(d);
                                if (!userId) return null;

                                const m = getMember(userId);
                                const avatar =
                                    m.avatarUrl ||
                                    m.profileImage?.url ||
                                    m.profile?.avatarUrl ||
                                    null;

                                return (
                                    <div key={userId} className="flex items-center gap-3 mb-3">
                                        <Avatar className="w-9 h-9">
                                            <AvatarImage src={avatar} />
                                            <AvatarFallback>{m.username?.[0] || "?"}</AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <p className="font-medium">{m.username || "Unknown"}</p>
                                            <p className="text-xs text-muted-foreground">{fmt(at)}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </section>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

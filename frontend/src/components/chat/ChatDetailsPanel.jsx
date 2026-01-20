import { useEffect, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useUIStore } from "@/store/useUIStore";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/* --- Simple info box --- */
function InfoBox({ label, value }) {
  return (
    <div className="bg-muted/40 rounded-xl px-4 py-3 flex flex-col gap-1 border">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function ChatDetailsPanel() {
  const { activeChatId, chats } = useChatStore();
  const { profile } = useProfileStore();
  const { detailsPanelOpen, closeDetailsPanel, openChatView } = useUIStore();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const chat = chats.find((c) => String(c.chatId) === String(activeChatId));
  if (!chat) return null;

  const isGroup = chat.isGroup;
  const otherUser = !isGroup ? chat.otherUser : null;
  const groupMembers = isGroup ? chat.participants || [] : [];

  const name = isGroup ? chat.name : otherUser?.username;
  const avatar = isGroup ? chat.groupAvatarUrl : otherUser?.avatarUrl;

  const lastSeenText = !isGroup
    ? otherUser?.isOnline
      ? "Online"
      : otherUser?.lastSeenAt
        ? `Last seen ${new Date(otherUser.lastSeenAt).toLocaleString()}`
        : "Offline"
    : null;

  return (
    <Sheet
      open={detailsPanelOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDetailsPanel();
          if (isMobile) openChatView(); // 🔑 remove black screen & go back
        }
      }}
    >
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "p-0 flex flex-col bg-card",
          isMobile
            ? "h-screen rounded-none"
            : "w-[min(420px,90vw)] border-l shadow-xl"
        )}
        overlayClassName={isMobile ? "bg-transparent pointer-events-none" : ""}
      >
        <SheetHeader className="px-5 py-3 border-b shrink-0">
          <SheetTitle className="text-md font-semibold">
            {isGroup ? "Group Info" : "Profile"}
          </SheetTitle>
        </SheetHeader>

        {/* 🔑 Scroll fills remaining height */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="flex flex-col items-center text-center gap-4 pb-8">
            <Avatar className="w-28 h-28">
              <AvatarImage src={avatar} />
              <AvatarFallback>{name?.[0]}</AvatarFallback>
            </Avatar>

            <h2 className="text-xl font-semibold">{name}</h2>

            {!isGroup && (
              <p className="text-xs text-muted-foreground">{lastSeenText}</p>
            )}

            {isGroup && chat.description && (
              <p className="text-sm text-muted-foreground max-w-xs">
                {chat.description}
              </p>
            )}
          </div>

          <div className="h-px w-full bg-border mb-8" />

          {!isGroup && otherUser && (
            <section className="space-y-4 mb-10">
              <h3 className="text-sm font-medium text-muted-foreground">
                User Information
              </h3>

              <InfoBox label="Username" value={otherUser.username} />
              <InfoBox label="Bio" value={otherUser.bio || "—"} />
              <InfoBox label="Status" value={lastSeenText} />
            </section>
          )}

          {isGroup && (
            <>
              <section className="space-y-4 mb-10">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Group Details
                </h3>

                <InfoBox
                  label="Created On"
                  value={new Date(chat.createdAt).toLocaleString()}
                />
                <InfoBox
                  label="Total Members"
                  value={groupMembers.length}
                />
              </section>

              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Members
                </h3>

                <div className="space-y-4">
                  {groupMembers.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={m.avatarUrl} />
                        <AvatarFallback>{m.username?.[0]}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className="font-medium">{m.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.isOnline
                            ? "Online"
                            : m.lastSeenAt
                              ? `Last seen ${new Date(m.lastSeenAt).toLocaleString()}`
                              : "Offline"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

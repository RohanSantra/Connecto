import React, { useState, useEffect, useRef, useCallback } from "react";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";
import { useUIStore } from "@/store/useUIStore";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";

/* -----------------------
   Utility: highlight matches
   - prefer contiguous substring matches
   - else highlight subsequence chars
-------------------------*/
function highlightMatches(text = "", query = "") {
    if (!query) return text;
    const lower = text.toLowerCase();
    const q = query.toLowerCase().trim();
    if (!q) return text;

    const idx = lower.indexOf(q);
    if (idx !== -1) {
        return [
            text.slice(0, idx),
            <mark key="hl" className="rounded px-0.5 bg-primary/20 text-foreground">{text.slice(idx, idx + q.length)}</mark>,
            text.slice(idx + q.length),
        ];
    }

    // subsequence highlight
    const res = [];
    let qi = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (qi < q.length && ch.toLowerCase() === q[qi]) {
            res.push(<mark key={i} className="rounded px-0.5 bg-secondary/30">{ch}</mark>);
            qi++;
        } else {
            res.push(ch);
        }
    }
    return res;
}

/* -----------------------
   Component
-------------------------*/
export default function NewChatOverlay() {
    const { newChatOpen, closeNewChat, openChatView } = useUIStore();
    const { isMobile } = useResponsiveDrawer();
    const { createOneToOneChat, setActiveChatId } = useChatStore();
    const { searchProfiles, searchLoading } = useProfileStore();

    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);

    // keyboard nav
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const itemRefs = useRef([]);

    // for input focus / hint
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!newChatOpen) {
            setSearch("");
            setResults([]);
            setFocusedIndex(-1);
        }
    }, [newChatOpen]);

    useEffect(() => {
        if (search.trim().length < 2) {
            setResults([]);
            setFocusedIndex(-1);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const data = await searchProfiles(search);
                setResults(data || []);
                setFocusedIndex(data && data.length ? 0 : -1);
            } catch (err) {
                console.warn("searchProfiles failed", err);
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(t);
    }, [search, searchProfiles]);

    // keyboard handling (local to overlay)
    useEffect(() => {
        function onKey(e) {
            // Only when THIS overlay search is focused
            if (document.activeElement !== inputRef.current) return;

            const len = results.length;
            if (len === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedIndex(prev => prev < len - 1 ? prev + 1 : 0);
            }

            else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedIndex(prev => prev > 0 ? prev - 1 : len - 1);
            }

            else if (e.key === "Enter") {
                if (focusedIndex >= 0 && focusedIndex < len) {
                    e.preventDefault();
                    startChat(results[focusedIndex].userId);
                }
            }

            else if (e.key === "Escape") {
                inputRef.current.blur();
                setFocusedIndex(-1);
            }
        }

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);

    }, [results, focusedIndex]);

    const startChat = async (userId) => {
        const toastId = toast.loading("Starting conversation...");

        try {
            const chat = await createOneToOneChat(userId);
            const activeId = chat.chatId || chat._id;

            if (!activeId) {
                throw new Error("Unable to start the conversation.");
            }

            await setActiveChatId(activeId);
            
            openChatView();

            toast.success("Conversation started successfully.", { id: toastId });

            closeNewChat();
            setSearch("");
            setResults([]);
            setFocusedIndex(-1);

        } catch (err) {
            toast.error(
                err?.message || "We couldn’t start the conversation. Please try again.",
                { id: toastId }
            );
        }
    };

    const ListUI = (
        <div className="p-4 space-y-3">
            <div className="relative">
                <Input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setFocusedIndex(-1);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Search username… (type 2+ chars)"
                    className="pl-3"
                    aria-label="Search users"
                />
                {/* keyboard hint */}
                {!isMobile && isFocused && (
                    <div className="absolute right-2 top-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md select-none">
                        ↑ ↓ · Enter · Esc
                    </div>
                )}
            </div>

            <ScrollArea className="max-h-[60vh] border rounded-md">
                {searchLoading ? (
                    <p className="py-4 text-center text-muted-foreground text-sm">Searching…</p>
                ) : results.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground text-sm">
                        {search.trim() ? "No users found" : "Start typing to find users"}
                    </p>
                ) : (
                    <div
                        role="listbox"
                        aria-activedescendant={focusedIndex >= 0 ? `nc-item-${focusedIndex}` : undefined}
                        className="flex flex-col divide-y divide-border"
                    >
                        {results.map((u, i) => {
                            const isFocused = i === focusedIndex;
                            const label = u.username || (u.user && u.user.username) || "Unknown";
                            return (
                                <div
                                    id={`nc-item-${i}`}
                                    role="option"
                                    aria-selected={isFocused}
                                    key={u._id || u.userId}
                                    ref={(el) => (itemRefs.current[i] = el)}
                                    className={`px-3 py-2 cursor-pointer ${isFocused ? "bg-accent/40 ring-2 ring-primary/60" : "hover:bg-accent/30"}`}
                                    onClick={() => startChat(u.userId)}
                                    onMouseEnter={() => setFocusedIndex(i)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-9 h-9">
                                            <AvatarImage src={u.avatarUrl} />
                                            <AvatarFallback>{(label || "?")[0]}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium truncate">
                                                    {highlightMatches(label, search)}
                                                </div>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {u.isOnline ? "Online" : u.lastSeen ? formatDistanceToNowStrict(new Date(u.lastSeen), { addSuffix: true }) : ""}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={newChatOpen} onOpenChange={closeNewChat}>
                <DrawerContent className="p-0 max-w-[720px] w-full h-[90vh]">
                    <DrawerHeader className="border-b px-4 py-3">
                        <DrawerTitle>Start New Chat</DrawerTitle>
                        <DrawerDescription>Find a user to chat</DrawerDescription>
                    </DrawerHeader>

                    {ListUI}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={newChatOpen} onOpenChange={closeNewChat}>
            <DialogContent className="max-w-md p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Start New Chat</DialogTitle>
                    <DialogDescription>Find a user to chat</DialogDescription>
                </DialogHeader>

                {ListUI}
            </DialogContent>
        </Dialog>
    );
}

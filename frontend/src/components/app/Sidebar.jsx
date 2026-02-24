import { useState, useMemo, useEffect, useRef } from "react";

import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";

import { getSocket } from "@/lib/socket";
import ChatListItem from "@/components/chat/ChatListItem";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { Search, Plus, Users, MoreVertical, MessageCircle, LogOut, Settings, User as UserIcon, Clock, ChartLine } from "lucide-react";

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import EmptyState from "@/components/common/EmptyState";
import ConnectoLogo from "../common/ConnectoLogo";
import ConnectoBrandAndSlogan from "../common/ConnectoBrandAndSlogan";
import { cn } from "@/lib/utils";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";
import { useNavigate } from "react-router-dom";
import ChatListSkeleton from "../Skeleton/ChatListSkeleton";
import { toast } from "sonner";

/* --------------------------
   Sidebar component
   -------------------------- */
export default function Sidebar({ isDrawer = false }) {
    const { chats, activeChatId, setActiveChatId, loadingChats, hasFetchedChats } = useChatStore();
    const { profile } = useProfileStore();
    const { logout, user } = useAuthStore();
    const { openNewChat, openNewGroup, openSettings, openProfile, openChatView } = useUIStore();

    const { isMobile } = useResponsiveDrawer();

    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilters, setActiveFilters] = useState(new Set()); // intersection filters
    const [connection, setConnection] = useState({ connected: false, reconnecting: false });

    // keyboard navigation
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const itemRefs = useRef([]); // array of DOM nodes for scrollIntoView
    const inputRef = useRef(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const navigate = useNavigate();
    const isAdmin = user?.isAdmin;

    /* --------------------------
       Socket connection status
       -------------------------- */
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        setConnection({ connected: socket.connected, reconnecting: false });

        const onConnect = () => setConnection({ connected: true, reconnecting: false });
        const onDisconnect = () => setConnection({ connected: false, reconnecting: false });
        const onReconnecting = () => setConnection({ connected: false, reconnecting: true });

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("reconnect_attempt", onReconnecting);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("reconnect_attempt", onReconnecting);
        };
    }, []);

    const connectionLabel = connection.reconnecting ? "Reconnecting…" : connection.connected ? "Online" : "Offline";

    /* --------------------------
       Helpers: scoring & filtering
       -------------------------- */
    const normalize = (s = "") => String(s || "").toLowerCase();

    // subsequence ratio for fuzzy scoring
    function subsequenceRatio(query, text) {
        if (!query || !text) return 0;
        let qi = 0, ti = 0;
        while (qi < query.length && ti < text.length) {
            if (query[qi] === text[ti]) qi++;
            ti++;
        }
        return qi / query.length;
    }

    function scoreChat(chat, q) {
        if (!q) return 0;
        q = normalize(q);
        let score = 0;

        const name = chat.isGroup ? normalize(chat.name || "") : normalize(chat.otherUser?.username || "");
        if (name.startsWith(q)) score += 6;
        else if (name.includes(q)) score += 4;

        // participant match
        const partMatch = (chat.participants || []).some(p => normalize(p.username || "").includes(q));
        if (partMatch) score += 2;

        // last message content
        const preview = normalize(chat.lastMessage?.content || "");
        if (preview.includes(q)) score += 2;

        // fuzzy subsequence on composed text
        const bestText = [name, preview, ...(chat.participants || []).map(p => normalize(p.username || ""))].join(" ");
        const subRatio = subsequenceRatio(q, bestText);
        score += Math.round(subRatio * 3);

        return score;
    }

    function passesFilters(chat, filtersSet) {
        if (!filtersSet || filtersSet.size === 0) return true;
        for (let f of filtersSet) {
            if (f === "online") {
                // prefer chat.otherUser; fallback to participant excluding me
                const other = chat.otherUser || (chat.participants || []).find(p => String(p.userId) !== String(profile?.userId));
                if (!other || !other.isOnline) return false;
            } else if (f === "unread") {
                if (!(chat.unreadCount > 0)) return false;
            } else if (f === "groups") {
                if (!chat.isGroup) return false;
            } else if (f === "pinned") {
                if (!chat.pinned) return false;
            }
        }
        return true;
    }

    /* --------------------------
       Filter + score list (memoized)
       -------------------------- */
    const filteredChats = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const searching = q.length > 0;

        let list = (chats || []).filter(c => passesFilters(c, activeFilters));

        if (!searching) {
            list.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                const ta = new Date(a?.lastMessage?.createdAt || a.createdAt || 0).getTime();
                const tb = new Date(b?.lastMessage?.createdAt || b.createdAt || 0).getTime();
                return tb - ta;
            });
            return list;
        }

        const scored = list
            .map(chat => ({ chat, score: scoreChat(chat, q) }))
            .filter(x => x.score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (a.chat.pinned && !b.chat.pinned) return -1;
                if (!a.chat.pinned && b.chat.pinned) return 1;
                const ta = new Date(a.chat?.lastMessage?.createdAt || a.chat.createdAt || 0).getTime();
                const tb = new Date(b.chat?.lastMessage?.createdAt || b.chat.createdAt || 0).getTime();
                return tb - ta;
            })
            .map(x => x.chat);

        return scored;
    }, [chats, searchTerm, activeFilters, profile]);

    /* --------------------------
       When results change, clamp focusedIndex and reset refs
       -------------------------- */
    useEffect(() => {
        itemRefs.current = [];
        if (filteredChats.length === 0) {
            setFocusedIndex(-1);
        } else {
            setFocusedIndex(idx => {
                if (idx < 0) return -1;
                if (idx >= filteredChats.length) return filteredChats.length - 1;
                return idx;
            });
        }
    }, [filteredChats]);

    /* --------------------------
       Scroll focused item into view
       -------------------------- */
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            try {
                itemRefs.current[focusedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
            } catch (e) { /* ignore */ }
        }
    }, [focusedIndex]);

    /* --------------------------
       Keyboard navigation: ArrowUp / ArrowDown / Enter / Escape
       -------------------------- */
    useEffect(() => {
        function onKey(e) {
            // Only trigger when sidebar search input is focused
            if (document.activeElement !== inputRef.current) return;

            const len = filteredChats.length;
            if (len === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedIndex(prev => prev === -1 ? 0 : Math.min(prev + 1, len - 1));
            }

            else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedIndex(prev => prev === -1 ? len - 1 : Math.max(prev - 1, 0));
            }

            else if (e.key === "Enter") {
                if (focusedIndex >= 0 && focusedIndex < len) {
                    e.preventDefault();
                    const chat = filteredChats[focusedIndex];
                    if (chat) handleSelectChat(chat);
                    setFocusedIndex(-1);
                    inputRef.current.blur();
                }
            }

            else if (e.key === "Escape") {
                setFocusedIndex(-1);
                inputRef.current.blur();
            }
        }

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);

    }, [filteredChats, focusedIndex]);


    useEffect(() => {
        function onSlash(e) {
            if (e.key === "/" && document.activeElement !== inputRef.current) {
                e.preventDefault();
                inputRef.current.focus();
            }
        }

        window.addEventListener("keydown", onSlash);
        return () => window.removeEventListener("keydown", onSlash);
    }, []);

    /* --------------------------
       Toggle filter set
       -------------------------- */
    const toggleFilter = (key) => {
        setActiveFilters(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    /* --------------------------
       Select chat (click or Enter)
       -------------------------- */
    const handleSelectChat = async (chat) => {
        if (activeChatId !== chat.chatId) {
            setActiveChatId(chat.chatId);
            openChatView();
        }
    };

    const handleLogout = async () => {
        const toastId = toast.loading("Signing out...");

        try {
            await logout();

            toast.success("Signed out successfully", { id: toastId });

        } catch (err) {
            toast.error(
                err?.message || "Logout failed",
                { id: toastId }
            );
        }
    };


    /* --------------------------
       Render
       -------------------------- */
    return (
        <div className={cn("flex flex-col h-full bg-card border-r border-border", isDrawer && "h-screen")}>
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <ConnectoLogo />
                    <ConnectoBrandAndSlogan />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={openNewChat}
                        aria-label="Start a new chat"
                        title="New chat (Alt + N)"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={openNewGroup}
                        aria-label="Create a new group"
                        title="New group (Ctrl + G)"
                    >
                        <Users className="w-4 h-4" />
                    </Button>
                </div>

            </div>

            {/* SEARCH */}
            <div className="px-4 pt-2 pb-3 border-b border-border sticky top-0 z-20">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />

                    <Input
                        ref={inputRef}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setFocusedIndex(-1);
                        }}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Search…"
                        className="pl-9 rounded-xl text-sm shadow-none border border-border focus:ring-1"
                        aria-label="Search chats"
                    />
                </div>

                {/* keyboard hint — only desktop, moved BELOW input */}
                {!isMobile && isSearchFocused && (
                    <div className="mt-1 flex gap-1 text-[10px] text-muted-foreground opacity-70 select-none">
                        <span className="px-1 py-0.5 border rounded">↑ ↓</span>
                        <span className="px-1 py-0.5 border rounded">Enter</span>
                        <span className="px-1 py-0.5 border rounded">Esc</span>
                    </div>
                )}
            </div>


            {/* FILTER BADGES */}
            <div className="px-4 py-2">
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: "all", label: "All" },
                        { key: "online", label: "Online" },
                        { key: "unread", label: "Unread" },
                        { key: "groups", label: "Groups" },
                        { key: "pinned", label: "Pinned" },
                    ].map((f) => {
                        const active = f.key === "all" ? activeFilters.size === 0 : activeFilters.has(f.key);
                        return (
                            <Badge
                                key={f.key}
                                variant={active ? "default" : "outline"}
                                className="cursor-pointer rounded-full px-3 py-1 select-none"
                                onClick={() => f.key === "all" ? setActiveFilters(new Set()) : toggleFilter(f.key)}
                            >
                                {f.label}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* CHAT LIST (accessible listbox) */}
            <ScrollArea className="flex-1 overflow-y-auto">
                {loadingChats || !hasFetchedChats ? (
                    <ChatListSkeleton count={10} />
                ) : filteredChats.length === 0 ? (
                    <EmptyState
                        icon={<MessageCircle className="w-8 h-8" />}
                        mobileNewChatCTA={openNewChat}
                        mobileNewGroupCTA={openNewGroup}
                    />
                ) : (
                    <div
                        role="listbox"
                        aria-activedescendant={
                            focusedIndex >= 0 ? `chat-item-${focusedIndex}` : undefined
                        }
                        className="flex flex-col"
                    >
                        {filteredChats.map((chat, idx) => {
                            const isFocused = idx === focusedIndex;
                            return (
                                <div
                                    key={chat.chatId}
                                    id={`chat-item-${idx}`}
                                    role="option"
                                    aria-selected={isFocused}
                                    ref={(el) => (itemRefs.current[idx] = el)}
                                    className={cn(
                                        "rounded-md mx-2 my-1",
                                        isFocused
                                            ? "ring-2 ring-primary/60 bg-accent/40"
                                            : ""
                                    )}
                                >
                                    <div onClick={() => handleSelectChat(chat)}>
                                        <ChatListItem
                                            chat={chat}
                                            onClick={() => handleSelectChat(chat)}
                                            searchTerm={searchTerm}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>


            <Separator />

            {/* FOOTER */}
            <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatarUrl} />
                        <AvatarFallback>{profile?.username?.[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{profile?.username}</p>
                        <p className="text-xs text-muted-foreground">{connectionLabel}</p>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-md hover:bg-muted">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-48">
                            {isAdmin && (
                                <DropdownMenuItem onClick={() => navigate("/admin/analytics")}>
                                    <ChartLine className="w-4 h-4 mr-2" /> Analytics
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => navigate("/calls/history")}>
                                <Clock className="w-4 h-4 mr-2" /> Call history
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate("/settings")}>
                                <Settings className="w-4 h-4 mr-2" /> Settings
                            </DropdownMenuItem>

                            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                                <LogOut className="w-4 h-4 mr-2" /> Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

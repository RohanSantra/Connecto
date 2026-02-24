import { useEffect, useMemo, useState } from "react";
import {
    ShieldBan,
    Users,
    UserX,
    Unlock,
    CalendarDays,
    Circle,
    Search,
    ArrowUpDown,
    Loader2
} from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBlockStore } from "@/store/useBlockStore";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

/* ====================================================== */
/* MAIN                                                   */
/* ====================================================== */
export default function BlockedSection() {
    const {
        blockedUsers,
        blockedChats,
        fetchBlocks,
        unblockUser,
        unblockChat,
        loading,
    } = useBlockStore();

    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("recent");

    useEffect(() => {
        fetchBlocks();
    }, [fetchBlocks]);

    const applyFilters = (list, getName) =>
        [...list]
            .filter((i) =>
                getName(i).toLowerCase().includes(query.toLowerCase())
            )
            .sort((a, b) =>
                sort === "recent"
                    ? new Date(b.blockedAt) - new Date(a.blockedAt)
                    : new Date(a.blockedAt) - new Date(b.blockedAt)
            );

    const users = useMemo(
        () => applyFilters(blockedUsers, (b) => b.user.username || ""),
        [blockedUsers, query, sort]
    );

    const chats = useMemo(
        () => applyFilters(blockedChats, (b) => b.chat.name || ""),
        [blockedChats, query, sort]
    );

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-12 sm:pb-16 space-y-8 sm:space-y-10">

            <Header query={query} setQuery={setQuery} sort={sort} setSort={setSort} />

            {/* 🔢 Stats Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatBox icon={UserX} label="Blocked Users" value={blockedUsers.length} />
                <StatBox icon={Users} label="Blocked Groups" value={blockedChats.length} />
                <StatBox icon={ShieldBan} label="Total Blocks" value={blockedUsers.length + blockedChats.length} />
            </div>

            {/* 🧩 Panels */}
            <div className="space-y-8">

                <Panel title="Blocked Users" icon={UserX}>
                    <ListWrapper
                        loading={loading}
                        items={users}
                        empty="No blocked users."
                        render={(b) => (
                            <BlockRow
                                key={b.user.userId}
                                name={b.user.username}
                                avatar={b.user.avatarUrl}
                                isOnline={b.user.isOnline}
                                blockedAt={b.blockedAt}
                                onUnblockAction={() => unblockUser(b.user.userId)}
                            />
                        )}
                    />
                </Panel>

                <Panel title="Blocked Groups" icon={Users}>
                    <ListWrapper
                        loading={loading}
                        items={chats}
                        empty="No blocked groups."
                        render={(b) => (
                            <BlockRow
                                key={b.chat.chatId}
                                name={b.chat.name}
                                avatar={b.chat.groupAvatarUrl}
                                subtitle={`${b.chat.memberCount || 0} members`}
                                blockedAt={b.blockedAt}
                                onUnblockAction={() => unblockChat(b.chat.chatId)}
                            />
                        )}
                    />
                </Panel>

            </div>
        </div>
    );
}


function Header({ query, setQuery, sort, setSort }) {
    return (
        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 sm:p-3 rounded-xl bg-destructive/10 shrink-0">
                    <ShieldBan className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl font-semibold">
                        Blocked Accounts
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage users and groups you’ve blocked
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64 md:w-72">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search blocked..."
                        className="pl-9"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() =>
                        setSort(sort === "recent" ? "oldest" : "recent")
                    }
                >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {sort === "recent" ? "Recent" : "Oldest"}
                </Button>
            </div>
        </div>

    );
}


function StatBox({ icon: Icon, label, value }) {
    return (
        <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-xl bg-muted/40 shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                    {label}
                </p>
                <p className="text-xl sm:text-2xl font-semibold">
                    {value}
                </p>
            </div>
        </div>
    );
}


function Panel({ title, icon: Icon, children }) {
    return (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b bg-muted/30">
                <Icon className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{title}</span>
            </div>
            <div className="divide-y">{children}</div>
        </div>
    );
}

function ListWrapper({ items, loading, empty, render }) {
    if (loading) return <SkeletonList />;
    if (!items.length) return <EmptyState text={empty} />;
    return items.map(render);
}

function BlockRow({
    name,
    avatar,
    isOnline,
    blockedAt,
    subtitle,
    onUnblockAction,
}) {
    const [loading, setLoading] = useState(false);

    const handleUnblock = async () => {
        if (loading) return;

        const toastId = toast.loading("Unblocking...");
        setLoading(true);

        try {
            await onUnblockAction();
            toast.success("Block has been removed successfully.", { id: toastId });
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 py-4 hover:bg-muted/30 transition">
            <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 shrink-0">
                    <AvatarImage src={avatar} />
                    <AvatarFallback>{name?.[0]}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium break-words">{name}</span>
                        {isOnline && (
                            <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500 shrink-0" />
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center">
                        {subtitle && <span>{subtitle}</span>}
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        <span>
                            Blocked{" "}
                            {formatDistanceToNow(new Date(blockedAt), {
                                addSuffix: true,
                            })}
                        </span>
                    </div>
                </div>
            </div>

            <Button
                size="sm"
                variant="secondary"
                onClick={handleUnblock}
                disabled={loading}
                className="w-full sm:w-auto"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <Unlock className="w-4 h-4 mr-1" />
                        Unblock
                    </>
                )}
            </Button>
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="py-12 flex flex-col items-center text-muted-foreground text-sm">
            <ShieldBan className="w-8 h-8 mb-2 opacity-40" />
            {text}
        </div>
    );
}

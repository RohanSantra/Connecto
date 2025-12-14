import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { toast } from "sonner";

/* highlight util (same idea) */
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

    // subsequence fallback
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

export default function NewGroupOverlay() {
    const { newGroupOpen, closeNewGroup } = useUIStore();
    const { isMobile } = useResponsiveDrawer();
    const { createGroupChat } = useChatStore();
    const { searchProfiles, searchLoading } = useProfileStore();

    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);

    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);
    const [members, setMembers] = useState([]);

    // keyboard navigation for results
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const itemRefs = useRef([]);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!newGroupOpen) {
            setGroupName("");
            setGroupDescription("");
            setAvatarFile(null);
            setMembers([]);
            setResults([]);
            setSearch("");
            setFocusedIndex(-1);
        }
    }, [newGroupOpen]);

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
        }, 350);
        return () => clearTimeout(t);
    }, [search, searchProfiles]);

    useEffect(() => {
        function onKey(e) {
            // Only when group overlay search is focused
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
                    toggleMember(results[focusedIndex]);
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


    const toggleMember = (user) => {
        setMembers(prev => prev.some(m => m._id === user._id) ? prev.filter(m => m._id !== user._id) : [...prev, user]);
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return toast.error("Only images allowed");
        if (file.size > 2 * 1024 * 1024) return toast.error("Max 2MB");
        setAvatarFile(file);
    };

    const previewUrl = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : null), [avatarFile]);
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl]);

    const createGroup = async () => {
        if (!groupName.trim()) return toast.error("Group name required");
        if (members.length < 2) return toast.error("Add at least 2 members");

        const formData = new FormData();
        formData.append("name", groupName.trim());
        formData.append("description", groupDescription.trim() || "");
        formData.append("members", JSON.stringify(members.map(m => m.userId || m.user?.userId || m.userId)));
        if (avatarFile) formData.append("avatar", avatarFile);

        const created = await createGroupChat(formData);
        if (created) {
            toast.success("Group created");
            closeNewGroup();
        } else {
            toast.error("Failed to create group");
        }
    };

    const GroupUI = (
        <div className="p-4 space-y-4">
            <div className="flex flex-col items-center gap-2">
                <label className="relative group cursor-pointer">
                    <Avatar className="w-20 h-20">
                        <AvatarImage src={previewUrl || ""} />
                        <AvatarFallback>G</AvatarFallback>
                    </Avatar>

                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition rounded-full flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                    </div>

                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>

                <p className="text-xs text-muted-foreground">Optional group avatar</p>
            </div>

            <div>
                <Label>Group Name</Label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" />
            </div>

            <div>
                <Label>Group Description (optional)</Label>
                <textarea value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Add a short description..." className="w-full mt-1 p-2 border rounded-md text-sm min-h-[68px]" />
            </div>

            {members.length > 0 && (
                <div className="flex flex-wrap gap-2 border rounded-md p-2 bg-muted/40">
                    {members.map(u => (
                        <div key={u._id} className="flex items-center gap-2 px-2 py-1 bg-background border rounded-full shadow-sm text-sm">
                            <Avatar className="w-6 h-6">
                                <AvatarImage src={u.avatarUrl} />
                                <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                            </Avatar>

                            <span className="truncate max-w-[120px]">{u.username}</span>

                            <button onClick={() => toggleMember(u)} className="text-xs ml-1 rounded-full px-1 hover:bg-muted/40">✕</button>
                        </div>
                    ))}
                </div>
            )}

            <div>
                <Label>Add Members</Label>
                <Input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setFocusedIndex(-1);
                    }}
                    placeholder="Search users… (type 2+ chars)"
                />
            </div>

            <ScrollArea className="max-h-[40vh] border rounded-md">
                {searchLoading ? (
                    <p className="py-4 text-center text-muted-foreground text-sm">Searching…</p>
                ) : results.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground text-sm">{search ? "No users found" : "Start typing…"}</p>
                ) : (
                    <div role="listbox" aria-activedescendant={focusedIndex >= 0 ? `ng-item-${focusedIndex}` : undefined} className="flex flex-col divide-y divide-border">
                        {results.map((user, i) => {
                            const selected = members.some(m => m._id === user._id);
                            const isFocused = i === focusedIndex;
                            return (
                                <div
                                    key={user._id}
                                    id={`ng-item-${i}`}
                                    role="option"
                                    aria-selected={isFocused}
                                    ref={el => itemRefs.current[i] = el}
                                    className={`px-3 py-2 cursor-pointer flex items-center gap-3 ${selected ? "bg-muted/40" : "hover:bg-accent/30"} ${isFocused ? "ring-2 ring-primary/60" : ""}`}
                                    onClick={() => toggleMember(user)}
                                    onMouseEnter={() => setFocusedIndex(i)}
                                >
                                    <Avatar className="w-9 h-9">
                                        <AvatarImage src={user.avatarUrl} />
                                        <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-sm truncate">{highlightMatches(user.username || "Unknown", search)}</div>
                                            <div className="text-xs text-muted-foreground whitespace-nowrap">{user.isOnline ? "Online" : user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : ""}</div>
                                        </div>

                                        <div className="text-xs text-muted-foreground truncate">{highlightMatches(user.bio || (user.lastSeen ? `Last seen ${new Date(user.lastSeen).toLocaleString()}` : "Offline"), search)}</div>
                                    </div>

                                    {selected && <span className="text-xs font-medium text-primary ml-2">Added</span>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            <Button onClick={createGroup} className="w-full">Create Group</Button>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={newGroupOpen} onOpenChange={closeNewGroup}>
                <DrawerContent className="p-0 max-w-[720px] w-full h-[90vh]">
                    <DrawerHeader className="px-4 py-3 border-b">
                        <DrawerTitle>Create Group</DrawerTitle>
                        <DrawerDescription>Add members & set details</DrawerDescription>
                    </DrawerHeader>

                    {GroupUI}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={newGroupOpen} onOpenChange={closeNewGroup}>
            <DialogContent className="max-w-md p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Create Group</DialogTitle>
                    <DialogDescription>Add members & set details</DialogDescription>
                </DialogHeader>

                {GroupUI}
            </DialogContent>
        </Dialog>
    );
}

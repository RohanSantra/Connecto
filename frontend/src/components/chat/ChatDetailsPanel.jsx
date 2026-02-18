// src/components/ChatDetailsPanelWithEdit.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea as SA } from "@/components/ui/scroll-area";

import {
  User,
  Users,
  Info,
  Settings,
  Pin,
  Trash2,
  LogOut,
  UserMinus,
  UserPlus,
  MoreVertical,
  Edit3,
  Loader2,
  Upload,
  MessageSquare,
  Clock,
  DoorOpen,
  UserX,
  ShieldBan,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { toast } from "sonner";
import { useMessageStore } from "@/store/useMessageStore";
import { format } from "date-fns";
import { useBlockStore } from "@/store/useBlockStore";

/* ----------------------
   tiny UI helpers: OnlineDot + RoleBadge
   ---------------------- */
function OnlineDot({ isOnline }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute right-0 bottom-0 w-3 h-3 rounded-full ring-2 ring-background",
        isOnline ? "bg-emerald-500" : "bg-gray-400"
      )}
    />
  );
}

function RoleBadge({ role }) {
  if (!role) return null;
  const base =
    "ml-2 inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border text-xs font-medium";
  if (role === "admin") {
    return (
      <span className={`${base} bg-accent/10 border-accent text-accent-foreground`}>
        Admin
      </span>
    );
  }
  if (role === "moderator") {
    return <span className={`${base} bg-muted/20 text-muted-foreground`}>Mod</span>;
  }
  return <span className={`${base} bg-muted/10 text-muted-foreground`}>Member</span>;
}

/* ----------------------
   Small UI helpers
   ---------------------- */
function Section({ title, icon: Icon, danger, children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 space-y-4 shadow-sm mt-4",
        danger && "border-destructive"
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn("w-4 h-4", danger ? "text-destructive" : "text-muted-foreground")} />}
        <h3 className={cn("text-xs font-semibold uppercase tracking-wide", danger ? "text-destructive" : "text-muted-foreground")}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function InfoBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl bg-muted/30 px-4 py-3 border flex items-start gap-3">
      {Icon && <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, danger, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg border text-sm font-medium transition",
        danger ? "text-destructive hover:bg-destructive/20 border-destructive" : "hover:bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}

function DeactivatedBadge({ isDeactivated }) {
  if (!isDeactivated) return null

  return (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border border-destructive text-destructive bg-destructive/10 font-medium">
      Deactivated
    </span>
  )
}

/* ----------------------
   small highlight util
   ---------------------- */
function highlightMatches(text = "", query = "") {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return text;

  const idx = lower.indexOf(q);
  if (idx !== -1) {
    return [
      text.slice(0, idx),
      <mark key="hl" className="rounded px-0.5 bg-primary/20 text-foreground">
        {text.slice(idx, idx + q.length)}
      </mark>,
      text.slice(idx + q.length),
    ];
  }

  const res = [];
  let qi = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      res.push(
        <mark key={i} className="rounded px-0.5 bg-secondary/30">
          {ch}
        </mark>
      );
      qi++;
    } else {
      res.push(ch);
    }
  }
  return res;
}

/* =========================
   EditGroupOverlay component
   (unchanged except safe code kept)
   ========================= */
function EditGroupOverlay({ open, onOpenChange, initial = {}, onSave }) {
  const { searchProfiles, searchLoading } = useProfileStore();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [members, setMembers] = useState([]);

  const inputRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const savingRef = useRef(false);

  // keep a Set of initial member ids to detect newly added vs existing
  const initialMemberIdsRef = useRef(new Set());

  // pagination for results to avoid huge lists covering UI
  const [showAllResults, setShowAllResults] = useState(false);
  const RESULTS_PAGE = 20;

  useEffect(() => {
    if (open) {
      setGroupName(initial.name || "");
      setGroupDescription(initial.description || "");
      setAvatarFile(null);
      setMembers(initial.members ? [...initial.members] : []);
      setResults([]);
      setSearch("");
      setFocusedIndex(-1);
      const ids = new Set((initial.members || []).map((m) => String(m.userId || m._id)));
      initialMemberIdsRef.current = ids;
      setShowAllResults(false);
    }
  }, [open, initial]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      setFocusedIndex(-1);
      setShowAllResults(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const d = await searchProfiles(search, initial.chatId);
        setResults(d || []);
        setFocusedIndex(d && d.length ? 0 : -1);
        setShowAllResults(false);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, searchProfiles]);

  useEffect(() => {
    function onKey(e) {
      if (document.activeElement !== inputRef.current) return;
      const len = results.length;
      if (!len) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((p) => (p < len - 1 ? p + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((p) => (p > 0 ? p - 1 : len - 1));
      } else if (e.key === "Enter") {
        if (focusedIndex >= 0 && focusedIndex < len) {
          e.preventDefault();
          handleResultClick(results[focusedIndex]);
        }
      } else if (e.key === "Escape") {
        inputRef.current.blur();
        setFocusedIndex(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, focusedIndex]);

  const handleResultClick = (user) => {
    const id = String(user.userId || user._id);
    if (initialMemberIdsRef.current.has(id)) {
      return;
    }
    setMembers((prev) => {
      const exists = prev.some((m) => String(m.userId || m._id) === id);
      if (exists) {
        return prev.filter((m) => String(m.userId || m._id) !== id);
      }
      return [...prev, user];
    });
  };

  const removeMemberPill = (user) => {
    const id = String(user.userId || user._id);
    setMembers((prev) => prev.filter((m) => String(m.userId || m._id) !== id));
  };

  const handleAvatarUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Only images allowed");
    if (f.size > 2 * 1024 * 1024) return toast.error("Max 2MB");
    setAvatarFile(f);
  };

  const previewUrl = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : initial.groupAvatarUrl || null), [avatarFile, initial.groupAvatarUrl]);
  useEffect(() => () => {
    if (previewUrl && avatarFile) URL.revokeObjectURL(previewUrl);
  }, [previewUrl, avatarFile]);

  const submit = async () => {
    if (savingRef.current) return;
    if (!groupName.trim()) return toast.error("Group name required");
    savingRef.current = true;

    try {
      const addedMemberIds = members
        .filter((m) => !initialMemberIdsRef.current.has(String(m.userId || m._id)))
        .map((m) => m.userId || m._id);

      await onSave({
        newName: groupName.trim(),
        description: groupDescription.trim(),
        addedMemberIds,
        avatarFile,
      });
      onOpenChange(false);
    } catch (err) {
      console.warn(err);
      toast.error("Failed to save");
    } finally {
      savingRef.current = false;
    }
  };

  const resultsToShow = showAllResults ? results : results.slice(0, RESULTS_PAGE);
  const moreCount = Math.max(0, results.length - RESULTS_PAGE);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>Change details and add members</DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4 min-w-[320px]">
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

          {members.filter((u) => !initialMemberIdsRef.current.has(String(u.userId || u._id))).length > 0 && (
            <div className="flex flex-wrap gap-2 border rounded-md p-2 bg-muted/40">
              {members.filter((u) => !initialMemberIdsRef.current.has(String(u.userId || u._id))).map((u) => {
                const id = String(u.userId || u._id);
                return (
                  <div key={id} className="flex items-center gap-2 px-2 py-1 bg-accent/10 border-accent rounded-full shadow-sm text-sm">
                    <div className="relative">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <OnlineDot isOnline={!!u.isOnline} />
                    </div>
                    <span className="truncate max-w-[120px]">{u.username}</span>
                    <RoleBadge role={u.role} />
                    <span className="text-xs font-medium text-primary ml-1">Added</span>
                    <button onClick={() => removeMemberPill(u)} className="text-xs ml-2 rounded-full px-1 hover:bg-muted/40">✕</button>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Label>Add Members</Label>
            <Input ref={inputRef} value={search} onChange={(e) => { setSearch(e.target.value); setFocusedIndex(-1); }} placeholder="Search users… (type 2+ chars)" />
          </div>

          <SA className="max-h-[40vh] border rounded-md">
            {searchLoading ? (
              <p className="py-4 text-center text-muted-foreground text-sm">Searching…</p>
            ) : results.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">{search ? "No users found" : "Start typing…"}</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {resultsToShow.map((u, i) => {
                  const id = String(u.userId || u._id);
                  const isInitial = initialMemberIdsRef.current.has(id);
                  const isSelected = members.some((m) => String(m.userId || m._id) === id);
                  const isFocused = (!showAllResults ? i === focusedIndex : results.findIndex((r) => String(r.userId || r._id) === id) === focusedIndex);

                  if (isInitial) {
                    return (
                      <div
                        key={id}
                        title="Already a member"
                        aria-disabled="true"
                        className="px-3 py-2 flex items-center gap-3 opacity-60 cursor-not-allowed select-none"
                      >
                        <div className="relative">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={u.avatarUrl} />
                            <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <OnlineDot isOnline={!!u.isOnline} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm truncate">{highlightMatches(u.username || "Unknown", search)}</div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">{u.isOnline ? "Online" : u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : ""}</div>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{highlightMatches(u.bio || "", search)}</div>
                        </div>

                        <RoleBadge role={u.role} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleResultClick(u)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleResultClick(u); }}
                      onMouseEnter={() => setFocusedIndex(results.indexOf(u))}
                      className={cn(
                        "px-3 py-2 cursor-pointer flex items-center gap-3",
                        isSelected ? "bg-muted/40" : "hover:bg-accent/30",
                        isFocused ? "ring-2 ring-primary/60" : ""
                      )}
                    >
                      <div className="relative">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={u.avatarUrl} />
                          <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <OnlineDot isOnline={!!u.isOnline} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm truncate">{highlightMatches(u.username || "Unknown", search)}</div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{u.isOnline ? "Online" : u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : ""}</div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{highlightMatches(u.bio || "", search)}</div>
                      </div>

                      <RoleBadge role={u.role} />
                      {isSelected && <span className="text-xs font-medium text-primary ml-2">Added</span>}
                    </div>
                  );
                })}

                {!showAllResults && moreCount > 0 && (
                  <div className="p-2 flex items-center justify-center border-t">
                    <button className="text-sm underline" onClick={() => setShowAllResults(true)}>
                      Show {moreCount} more
                    </button>
                  </div>
                )}
              </div>
            )}
          </SA>

          <Button onClick={submit} className="w-full">
            {savingRef.current ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================
   ChatDetailsPanel (main)
   ========================= */
export default function ChatDetailsPanel() {
  const {
    activeChatId,
    chats,
    togglePin,
    deleteChat,
    leaveGroup,
    promoteMember,
    demoteMember,
    removeMember,
    activeChatDevices,
    fetchChatDevices,
    fetchChatDetails,
    renameGroup,
    updateGroupAvatar,
    addMember,
    createOneToOneChat,
    setActiveChatId,
  } = useChatStore();
  const { clearChatForUser } = useMessageStore();

  const { profile } = useProfileStore();
  const { detailsPanelOpen, closeDetailsPanel, openChatView } = useUIStore();

  const [isMobile, setIsMobile] = useState(false);

  // confirm dialog (single source of truth)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null); // { type, userId, label, username, pinned }

  // edit overlay
  const [editOpen, setEditOpen] = useState(false);
  const [editingInitial, setEditingInitial] = useState({});

  // member search within panel
  const [memberQuery, setMemberQuery] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);


  // Always compute chat (hooks must run consistently)
  const chat = chats.find((c) => String(c.chatId) === String(activeChatId));
  const isChatMissing = !chat;


  // If the chat disappears while panel is open -> close panel & cleanup overlays/dialogs.
  useEffect(() => {
    if (detailsPanelOpen && isChatMissing) {
      // close overlays/dialogs first
      setConfirmOpen(false);
      setEditOpen(false);
      // close the panel
      closeDetailsPanel();
      if (isMobile) {
        openChatView();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatMissing, detailsPanelOpen]);

  // use safe optional chaining everywhere below
  const isGroup = !!chat?.isGroup;
  const {
    blockChat,
    unblockChat,
    blockUser,
    unblockUser,
    isChatBlocked,
    isUserBlocked,
  } = useBlockStore();
  const groupBlocked = isGroup && isChatBlocked(chat?.chatId);

  const otherUser = !isGroup ? chat?.otherUser : null;
  const members = isGroup ? (chat?.participants || []) : [];
  const userBlocked = !isGroup && otherUser && isUserBlocked(otherUser.userId);
  const blockedByOther = chat?.otherUserBlockedMe;

  const name = isGroup ? chat?.name : otherUser?.username;
  const avatar = isGroup ? chat?.groupAvatarUrl : otherUser?.avatarUrl;

  const myMember = members.find((m) => String(m.userId) === String(profile.userId));
  const amAdmin = myMember?.role === "admin" && !groupBlocked;
  const adminCount = members.filter((m) => m.role === "admin").length;

  const canLeaveGroup = () => {
    if (!isGroup) return true;
    if (members.length < 3) return false;
    if (amAdmin && adminCount <= 1) return false;
    return true;
  };

  const lastSeenText = !isGroup
    ? otherUser?.isOnline
      ? "Online"
      : otherUser?.lastSeenAt
        ? `Last seen ${new Date(otherUser.lastSeenAt).toLocaleString()}`
        : "Offline"
    : null;


  // fetch devices for 1:1 only; guard when chat missing
  useEffect(() => {
    if (!chat) return;
    if (!chat.isGroup) fetchChatDevices(chat.chatId);
    // only want to run when chat id / type changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.chatId, chat?.isGroup, fetchChatDevices]);

  /* Confirm helpers */
  const openConfirm = (type, opts = {}) => {
    setConfirmPayload({ type, ...opts });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    // always guard: if chat disappeared, just close dialog
    if (!confirmPayload) { setConfirmOpen(false); return; }
    if (!chat) { setConfirmOpen(false); setConfirmPayload(null); return; }

    const { type, userId, pinned } = confirmPayload;

    try {
      if (type === "remove") {
        await removeMember(chat.chatId, userId);
        toast.success("Member removed");
      } else if (type === "leave") {
        await leaveGroup(chat.chatId);
        toast.success("Left group");
        // after leaving, the server will update sockets and likely remove chat for this user
        // ensure UI cleanup
        setActiveChatId(null);
        closeDetailsPanel();
      } else if (type === "delete") {
        await deleteChat(chat.chatId);
        toast.success("Deleted");
        // if deleted, close panel and active chat
        setActiveChatId(null);
        closeDetailsPanel();
      } else if (type === "chat") {
        const one = await createOneToOneChat(userId);
        if (one) {
          const cid = one.chatId || one._id || (one.chat && one.chat._id);
          if (cid) {
            try { setActiveChatId(cid); } catch { }
            closeDetailsPanel();
            openChatView();
          }
        } else {
          toast.error("Failed to start chat");
        }
      } else if (type === "clear") {
        try {
          await clearChatForUser(chat.chatId);
          toast.success("Chat cleared");
        } catch (err) {
          console.warn("clear chat failed", err);
          toast.error("Failed to clear chat");
        }
      } else if (type === "pin") {
        try {
          await togglePin(chat.chatId);
          toast.success(!pinned ? "Pinned" : "Unpinned");
        } catch (err) {
          console.warn("toggle pin failed", err);
          toast.error("Failed to toggle pin");
        }
      } else if (type === "promote") {
        try {
          await promoteMember(chat.chatId, userId);
          // fetch details to ensure local state matches server
          await fetchChatDetails(chat.chatId);
          toast.success("Member promoted");
        } catch (err) {
          console.warn("promote failed", err);
          toast.error("Failed to promote member");
        }
      } else if (type === "demote") {
        try {
          await demoteMember(chat.chatId, userId);
          await fetchChatDetails(chat.chatId);
          toast.success("Member demoted");
        } catch (err) {
          console.warn("demote failed", err);
          toast.error("Failed to demote member");
        }
      }

      // refresh chat details where it makes sense
      try { await fetchChatDetails(chat.chatId); } catch { }
    } catch (err) {
      console.warn("confirm action failed", err);
      toast.error("Action failed");
    } finally {
      setConfirmOpen(false);
      setConfirmPayload(null);
    }
  };

  /* Edit flow */
  const openEdit = () => {
    if (!chat) return;
    const initialMembers = members.map((m) => ({
      userId: m.userId,
      username: m.username,
      avatarUrl: m.avatarUrl,
      role: m.role,
      isOnline: m.isOnline,
      lastSeenAt: m.lastSeenAt,
    }));

    setEditingInitial({
      chatId: chat.chatId,
      name: chat.name,
      description: chat.description,
      members: initialMembers,
      groupAvatarUrl: chat.groupAvatarUrl,
    });
    setEditOpen(true);
  };

  const handleEditSave = async ({ newName, description, addedMemberIds, avatarFile }) => {
    if (!chat) {
      toast.error("Chat missing");
      return;
    }

    try {
      const nameChanged = newName !== undefined && String(newName).trim() !== String(chat.name || "").trim();
      const descChanged = (description !== undefined) && String(description || "").trim() !== String(chat.description || "").trim();
      const avatarChanged = !!avatarFile;
      const membersToAdd = Array.isArray(addedMemberIds) ? addedMemberIds.filter(Boolean) : [];

      if (!nameChanged && !descChanged && !avatarChanged && membersToAdd.length === 0) {
        toast.info("No changes to save");
        return;
      }

      if (nameChanged || descChanged) {
        await renameGroup(chat.chatId, { newName: nameChanged ? newName : undefined, description: descChanged ? description : undefined });
      }
      if (avatarChanged) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        await updateGroupAvatar(chat.chatId, fd);
      }
      if (membersToAdd.length) {
        for (const uid of membersToAdd) {
          try { await addMember(chat.chatId, uid); } catch (err) { console.warn("addMember failed", uid, err); }
        }
      }

      await fetchChatDetails(chat.chatId);
      toast.success("Group updated");
    } catch (err) {
      console.warn("edit save failed", err);
      toast.error("Failed to update group");
    }
  };

  const filteredMembers = useMemo(() => {
    const q = (memberQuery || "").trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const username = String(m.username || "").toLowerCase();
      const role = String(m.role || "").toLowerCase();
      return username.includes(q) || role.includes(q);
    });
  }, [memberQuery, members]);

  // compute confirm dialog text based on type
  const confirmTitle = (() => {
    const t = confirmPayload?.type;
    if (t === "remove") return "Remove Member";
    if (t === "leave") return "Leave Group";
    if (t === "delete") return "Delete Chat / Group";
    if (t === "chat") return `Start chat with ${confirmPayload?.username || "user"}?`;
    if (t === "clear") return "Clear Chat";
    if (t === "pin") return confirmPayload?.pinned ? "Unpin Chat" : "Pin Chat";
    if (t === "promote") return "Promote Member";
    if (t === "demote") return "Demote Member";
    return "Confirm";
  })();

  const confirmDescription = (() => {
    const t = confirmPayload?.type;
    if (t === "remove") return confirmPayload?.label || "Remove this member from the group?";
    if (t === "leave") return confirmPayload?.label || "Leave this group?";
    if (t === "delete") return confirmPayload?.label || "Are you sure? This action cannot be undone.";
    if (t === "chat") return confirmPayload?.label || "Open a 1:1 chat with this person.";
    if (t === "clear") return confirmPayload?.label || "Clear chat history for you. You will lose messages locally.";
    if (t === "pin") return confirmPayload?.pinned ? "Unpin this chat?" : "Pin this chat to the top?";
    if (t === "promote") return confirmPayload?.label || "Promote this member to admin?";
    if (t === "demote") return confirmPayload?.label || "Demote this member from admin?";
    return confirmPayload?.label || "Are you sure? This action cannot be undone.";
  })();

  const handleBlockToggle = async () => {
    try {
      if (isGroup) {
        groupBlocked
          ? await unblockChat(chat.chatId)
          : await blockChat(chat.chatId);
      } else if (otherUser) {
        userBlocked
          ? await unblockUser(otherUser.userId)
          : await blockUser(otherUser.userId);
      }
    } catch (err) {
      console.warn("Block toggle failed", err);
    }
  };



  return (
    <>
      <Sheet open={detailsPanelOpen} onOpenChange={(o) => { if (!o) { closeDetailsPanel(); if (isMobile) openChatView(); } }}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "p-0 flex flex-col bg-card",
            isMobile ? "h-[95%] rounded-none" : "w-full sm:max-w-3xl border-l shadow-xl"
          )}
        >
          <SheetHeader className="px-5 py-3 border-b shrink-0 flex items-center justify-between gap-4">
            <div>
              <SheetTitle className="text-lg">{isGroup ? "Group Info" : "Profile"}</SheetTitle>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-6 space-y-6 min-h-0">
            {/* If chat is missing show fallback */}
            {isChatMissing ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">Chat no longer exists</div>
            ) : (
              <>
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <Avatar className="w-28 h-28 ring-4 ring-background shadow-md rounded-xl mt-2">
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="rounded-xl">{name?.[0]}</AvatarFallback>
                    </Avatar>

                    {!isGroup && <OnlineDot isOnline={!!otherUser?.isOnline} />}
                  </div>

                  <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                    {name}
                    {!isGroup && <DeactivatedBadge isDeactivated={otherUser?.isDeactivated} />}
                  </h2>


                </div>

                {isGroup ? (
                  <Section title="Group Details" icon={Users}>
                    <div className="flex flex-col gap-4">
                      <InfoBox label="Group Name" value={chat?.name} icon={User} />
                      <InfoBox label="Description" value={chat?.description || "—"} icon={Info} />
                      <InfoBox
                        label="Created at"
                        value={
                          chat?.createdAt
                            ? format(new Date(chat.createdAt), "PPP") // date only
                            : "—"
                        }
                        icon={Clock}
                      />
                    </div>
                  </Section>
                ) : (
                  <Section title="User Details" icon={Users}>
                    <div className="flex flex-col gap-4">
                      <InfoBox label="Name" value={otherUser?.username} icon={User} />
                      <InfoBox label="Bio" value={otherUser?.bio || "—"} icon={Info} />
                      <InfoBox label="Last Seen" value={
                        lastSeenText !== "Online"
                          ? format(new Date(otherUser.lastSeenAt), "PPP") // date only
                          : "Online"
                      } icon={Clock} />

                    </div>
                  </Section>
                )}

                {isGroup && (
                  <Section title={`Members (${members.length})`} icon={Users}>
                    <div className="flex items-center gap-3">
                      <Input placeholder="Search members..." value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} className="flex-1" />
                    </div>

                    <div className="space-y-3 mt-3">
                      {filteredMembers.length === 0 ? (
                        <div className="py-4 text-center text-muted-foreground">No members found</div>
                      ) : (
                        filteredMembers.map((m) => {
                          const isMe = String(m.userId) === String(profile.userId);
                          return (
                            <div key={m.userId} className="relative flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                              <div className="relative">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={m.avatarUrl} />
                                  <AvatarFallback>{m.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <OnlineDot isOnline={!!m.isOnline} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium flex items-center gap-2">
                                  <span className="truncate">{m.username}</span>
                                  <RoleBadge role={m.role} />
                                  <DeactivatedBadge isDeactivated={m.isDeactivated} />

                                  {isMe && <span className="text-xs text-muted-foreground">(You)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {m.isOnline ? "Online" : (m.lastSeenAt ? `Last seen ${new Date(m.lastSeenAt).toLocaleString()}` : "Offline")}
                                </p>
                              </div>

                              {!isMe && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-2 rounded-md hover:bg-muted">
                                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => openConfirm("chat", { userId: m.userId, username: m.username })} className="gap-2">
                                      <MessageSquare className="w-4 h-4" /> Chat
                                    </DropdownMenuItem>

                                    {amAdmin && (
                                      <>
                                        {m.role === "member" && (
                                          <DropdownMenuItem onClick={() => openConfirm("promote", { userId: m.userId, username: m.username })} className="gap-2">
                                            <UserPlus className="w-4 h-4" /> Promote
                                          </DropdownMenuItem>
                                        )}

                                        {m.role === "admin" && (
                                          <DropdownMenuItem onClick={() => openConfirm("demote", { userId: m.userId, username: m.username })} className="gap-2">
                                            <UserMinus className="w-4 h-4" /> Demote
                                          </DropdownMenuItem>
                                        )}

                                        <DropdownMenuItem onClick={() => openConfirm("remove", { userId: m.userId, label: `Remove ${m.username}?` })} className="gap-2 text-destructive focus:text-destructive">
                                          <Trash2 className="w-4 h-4" /> Remove
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Section>
                )}

                <Section title="Chat Settings" icon={Settings}>
                  {isGroup && (
                    <ActionButton
                      onClick={openEdit}
                      label="Edit Group"
                      icon={Edit3}
                      disabled={!amAdmin}
                    />
                  )}

                  <ActionButton
                    label="Clear Chat"
                    icon={Trash2}
                    onClick={() => openConfirm("clear", { label: "Clear messages for you? This will remove local history." })}
                  />

                  <ActionButton
                    label={chat?.pinned ? "Unpin Chat" : "Pin Chat"}
                    icon={Pin}
                    onClick={() => openConfirm("pin", { pinned: !!chat?.pinned })}
                  />
                </Section>

                <Section title="Danger Zone" icon={Trash2} danger>
                  {/* Block / Unblock */}
                  {!blockedByOther && (
                    <ActionButton
                      label={
                        isGroup
                          ? groupBlocked
                            ? "Unblock Group"
                            : "Block Group"
                          : userBlocked
                            ? "Unblock User"
                            : "Block User"
                      }
                      icon={
                        isGroup
                          ? groupBlocked
                            ? ShieldCheck
                            : ShieldBan
                          : userBlocked
                            ? UserCheck
                            : UserX
                      }
                      danger
                      onClick={handleBlockToggle}
                    />
                  )}
                  {isGroup ? (
                    <>
                      <ActionButton
                        label={canLeaveGroup() ? "Leave Group" : "Cannot Leave (Admin/Small Group)"}
                        icon={DoorOpen}
                        danger
                        disabled={!canLeaveGroup() || groupBlocked}
                        onClick={() => openConfirm("leave", { label: "Leave this group?" })}
                      />
                      {amAdmin && !groupBlocked && (
                        <ActionButton
                          label="Delete Group"
                          icon={Trash2}
                          danger
                          onClick={() => openConfirm("delete", { label: "Delete this group? This cannot be undone." })}
                        />
                      )}
                    </>
                  ) : (
                    <ActionButton label="Delete Chat" icon={Trash2} danger onClick={() => openConfirm("delete", { label: "Delete this chat?" })} />
                  )}
                </Section>
              </>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* overlays */}
      <EditGroupOverlay open={editOpen} onOpenChange={(v) => setEditOpen(v)} initial={editingInitial} onSave={handleEditSave} />

      {/* confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="px-2">Cancel</Button>
            <Button onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:brightness-95 px-2">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

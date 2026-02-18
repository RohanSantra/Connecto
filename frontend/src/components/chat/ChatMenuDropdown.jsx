"use client";

import { useState, useMemo } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useChatStore } from "@/store/useChatStore";
import { useMessageStore } from "@/store/useMessageStore";
import { useProfileStore } from "@/store/useProfileStore";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
  MoreVertical,
  ImageIcon,
  Info,
  Trash2,
  Loader2,
  Pin,
  DoorOpen,
  UserX,
  UserCheck,
  ShieldBan,
  ShieldCheck,
} from "lucide-react";

import { useBlockStore } from "@/store/useBlockStore";
import { Button } from "../ui/button";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";

export default function ChatMenuDropdown() {
  const { openMediaDocs, openDetailsPanel, openDetailsView } = useUIStore();
  const { chats, deleteChat, leaveGroup, activeChatId, togglePin } = useChatStore();
  const { clearChatForUser } = useMessageStore();
  const { profile } = useProfileStore();
  const {
    blockChat,
    blockUser,
    isUserBlocked,
    isChatBlocked,
    unblockUser,
    unblockChat,
  } = useBlockStore();

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [loading, setLoading] = useState(null);
  const { isMobile } = useResponsiveDrawer();

  /* ---------------- SAFE CHAT FETCH ---------------- */
  const chat = useMemo(
    () => chats.find((c) => String(c.chatId) === String(activeChatId)),
    [chats, activeChatId]
  );
  if (!chat) return null;

  const chatId = chat.chatId;
  const isGroup = chat.isGroup;
  const isPinned = !!chat.pinned;

  const members = chat.participants || [];
  const myMemberData = members.find((p) => String(p.userId) === String(profile?.userId));
  const isAdmin = myMemberData?.role === "admin";
  const adminCount = members.filter((m) => m.role === "admin").length;

  const canLeaveGroup = () => {
    if (!isGroup) return true;
    if (members.length < 3) return false;
    if (isAdmin && adminCount <= 1) return false;
    return true;
  };

  const otherUser = !isGroup
    ? members.find((p) => String(p.userId) !== String(profile?.userId))
    : null;

  const blockedByMe = isGroup
    ? isChatBlocked(chatId)
    : otherUser
      ? isUserBlocked(otherUser.userId)
      : false;

  // 🔥 IMPORTANT — this is the ONLY place we still use chat flag
  // because "blocked by other" is not in block store (store = who YOU blocked)
  const blockedByOther = !isGroup && chat?.otherUserBlockedMe;

  const blocked = blockedByMe;


  /* ---------------- BLOCK ICON ---------------- */
  const BlockIcon = blocked
    ? isGroup
      ? ShieldCheck
      : UserCheck
    : isGroup
      ? ShieldBan
      : UserX;

  /* ---------------- ACTION WRAPPER ---------------- */
  const runAction = async (type, fn, closeSetter) => {
    try {
      setLoading(type);
      await fn();
    } finally {
      setLoading(null);
      closeSetter(false);
    }
  };

  const handleBlockToggle = async () => {
    if (loading === "block") return;
    setLoading("block");

    try {
      if (isGroup) {
        blocked ? await unblockChat(chatId) : await blockChat(chatId);
      } else if (otherUser) {
        blocked
          ? await unblockUser(otherUser.userId)
          : await blockUser(otherUser.userId);
      }
    } finally {
      setLoading(null);
    }
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={isMobile ? "sm" : "icon"}
            variant="outline">
            <MoreVertical className={isMobile ? "size-3" : "size-5"} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {/* ---------- VIEW ---------- */}
          <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
            View
          </DropdownMenuLabel>

          <DropdownMenuItem onClick={openMediaDocs}>
            <ImageIcon className="w-4 h-4 mr-2" />
            View Media
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() =>
            isMobile ? openDetailsView() : openDetailsPanel()
          }>
            <Info className="w-4 h-4 mr-2" />
            View Details
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* ---------- CHAT ---------- */}
          <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
            Chat
          </DropdownMenuLabel>

          <DropdownMenuItem onClick={() => togglePin(chatId)}>
            <Pin className="w-4 h-4 mr-2" />
            {isPinned ? "Unpin Chat" : "Pin Chat"}
          </DropdownMenuItem>


          <DropdownMenuSeparator />

          {/* ---------- DANGER ---------- */}
          <DropdownMenuLabel className="text-xs text-destructive px-2">
            Danger Zone
          </DropdownMenuLabel>

          {!blockedByOther && (
            <DropdownMenuItem
              onClick={handleBlockToggle}
              className="text-destructive focus:text-destructive"
              disabled={loading === "block"}
            >
              {loading === "block" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BlockIcon className="w-4 h-4 mr-2" />
              )}
              {blocked ? "Unblock" : isGroup ? "Block Group" : "Block User"}
            </DropdownMenuItem>
          )}



          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </DropdownMenuItem>

          {!isGroup && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Chat
            </DropdownMenuItem>
          )}

          {isGroup && isAdmin && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Group
            </DropdownMenuItem>
          )}

          {isGroup && canLeaveGroup() && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setConfirmLeave(true)}
            >
              <DoorOpen className="w-4 h-4 mr-2" />
              Leave Group
            </DropdownMenuItem>
          )}

          {isGroup && !canLeaveGroup() && (
            <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
              <DoorOpen className="w-4 h-4 mr-2" />
              Cannot Leave Group
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ---------------- CLEAR ---------------- */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Messages will be removed only for you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="px-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="px-2"
              onClick={() =>
                runAction("clear", () => clearChatForUser(chatId), setConfirmClear)
              }
            >
              {loading === "clear" ? <Loader2 className="animate-spin w-4 h-4" /> : "Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------------- DELETE ---------------- */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isGroup ? "Delete this group?" : "Delete this chat?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isGroup
                ? "This will permanently delete the group for all members."
                : "This will permanently delete the chat for both users."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="px-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="px-2"
              onClick={() =>
                runAction("delete", () => deleteChat(chatId), setConfirmDelete)
              }
            >
              {loading === "delete" ? <Loader2 className="animate-spin w-4 h-4" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------------- LEAVE ---------------- */}
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this group?</AlertDialogTitle>
            <AlertDialogDescription>
              You will stop receiving messages from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="px-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="px-2"
              onClick={() =>
                runAction("leave", () => leaveGroup(chatId), setConfirmLeave)
              }
            >
              {loading === "leave" ? <Loader2 className="animate-spin w-4 h-4" /> : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

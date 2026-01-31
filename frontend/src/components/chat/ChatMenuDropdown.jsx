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
  X,
  Loader2,
  Pin,
} from "lucide-react";

export default function ChatMenuDropdown() {
  const { openMediaDocs, openDetailsPanel } = useUIStore();
  const { chats, deleteChat, leaveGroup, activeChatId, togglePin } = useChatStore();
  const { clearChatForUser } = useMessageStore();
  const { profile } = useProfileStore();

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [loading, setLoading] = useState(null); // "clear" | "delete" | "leave"

  /* -------------------------------------------------- */
  /* Derive chat safely                                 */
  /* -------------------------------------------------- */
  const chat = useMemo(
    () => chats.find((c) => String(c.chatId) === String(activeChatId)),
    [chats, activeChatId]
  );

  if (!chat) return null; // 🔥 prevents crashes

  const chatId = chat.chatId;
  const isGroup = chat.isGroup;
  const isPinned = !!chat.pinned;

  const myMemberData = chat.participants?.find(
    (p) => String(p.userId) === String(profile?.userId)
  );
  const isAdmin = myMemberData?.role === "admin";

  const members = chat.participants || [];
  const adminCount = members.filter((m) => m.role === "admin").length;

  /* Same logic as details panel */
  const canLeaveGroup = () => {
    if (!isGroup) return true;
    if (members.length < 3) return false;
    if (isAdmin && adminCount <= 1) return false;
    return true;
  };


  /* -------------------------------------------------- */
  /* ACTIONS                                            */
  /* -------------------------------------------------- */

  const runAction = async (type, fn, closeSetter) => {
    try {
      setLoading(type);
      await fn();
    } finally {
      setLoading(null);
      closeSetter(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded-md hover:bg-accent">
            <MoreVertical className="w-5 h-5" />
          </button>
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

          <DropdownMenuItem onClick={openDetailsPanel}>
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
              <X className="w-4 h-4 mr-2" />
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
              <X className="w-4 h-4 mr-2" />
              Leave Group
            </DropdownMenuItem>
          )}

          {isGroup && !canLeaveGroup() && (
            <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
              <X className="w-4 h-4 mr-2" />
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

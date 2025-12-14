"use client";

import { useState } from "react";

import { useUIStore } from "@/store/useUIStore";
import { useChatStore } from "@/store/useChatStore";
import { useMessageStore } from "@/store/useMessageStore";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";

import {
  MoreVertical,
  ImageIcon,
  Info,
  Trash2,
  X,
  Loader2
} from "lucide-react";

export default function ChatMenuDropdown() {
  const { openMediaDocs, openDetailsPanel } = useUIStore();
  const { deleteChat, activeChatId } = useChatStore();
  const { clearChatForUser } = useMessageStore();

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [loadingClear, setLoadingClear] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const handleClearChat = async () => {
    setLoadingClear(true);
    try {
      await clearChatForUser(activeChatId);
    } finally {
      setLoadingClear(false);
      setConfirmClear(false);
    }
  };

  const handleDeleteChat = async () => {
    setLoadingDelete(true);
    try {
      await deleteChat(activeChatId);
    } finally {
      setLoadingDelete(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <MoreVertical className="w-5 h-5" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">

          <DropdownMenuItem onClick={openMediaDocs}>
            <ImageIcon className="w-4 h-4 mr-2" />
            View Media
          </DropdownMenuItem>

          <DropdownMenuItem onClick={openDetailsPanel}>
            <Info className="w-4 h-4 mr-2" />
            View Details
          </DropdownMenuItem>

          {/* OPEN CONFIRM CLEAR */}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
            Clear Chat
          </DropdownMenuItem>

          {/* OPEN CONFIRM DELETE */}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <X className="w-4 h-4 mr-2 text-destructive" />
            Delete Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ===== CONFIRM CLEAR CHAT ===== */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all messages only for you.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive"
              onClick={handleClearChat}
            >
              {loadingClear ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Clearing...
                </>
              ) : (
                "Yes, clear"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== CONFIRM DELETE CHAT ===== */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chat for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive"
              onClick={handleDeleteChat}
            >
              {loadingDelete ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Yes, delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

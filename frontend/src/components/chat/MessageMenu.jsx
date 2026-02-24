"use client";

import React, { useState, useMemo } from "react";
import {
  Copy,
  Trash2,
  Globe,
  ArrowDownToLine,
  Pin,
  Reply,
  Info,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
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
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { useMessageStore } from "@/store/useMessageStore";
import { useProfileStore } from "@/store/useProfileStore";
import { toast } from "sonner";
import { LANGUAGES } from "@/constants";
import { useChatStore } from "@/store/useChatStore";

/* Reusable Button */
const MenuItem = ({ icon: Icon, label, danger, onClick }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition active:scale-95
      ${danger ? "text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" : "hover:bg-muted/50"}`}
  >
    <Icon className="h-4 w-4 opacity-80" />
    {label}
  </button>
);

const Divider = () => <div className="my-1 border-t border-muted/40" />;

function MenuBody({ message = {}, isOwn = false, onClose, onShowInfo }) {
  const { deleteMessage, pinMessage, unpinMessage, setReplyTo, deletingMessageId } =
    useMessageStore();
  const { profile } = useProfileStore();

  const {
    _id,
    type,
    pinned,
    chatId,
    attachments = [],
    plaintext,
    ciphertext,
  } = message;


  const { activeChat } = useChatStore();

  const isGroup = !!activeChat?.isGroup;

  const myMemberData = activeChat?.participants?.find(
    (p) => String(p.userId) === String(profile?.userId)
  );

  const isAdmin = myMemberData?.role === "admin";

  const text = plaintext || ciphertext;
  const canCopy = type === "text" && text;
  const hasMedia = attachments.length > 0;

  const [alertType, setAlertType] = useState(null);

  /** translate helper: resolve language name */
  const getLangName = (code) =>
    LANGUAGES.find((l) => l.code === code)?.name || code.toUpperCase();

  /** Translation handler */
  const doTranslate = async (langCode) => {
    onClose?.();

    if (!text) {
      toast.error("There is no text to translate.");
      return;
    }

    const assumedOriginal = "en";

    if (assumedOriginal === langCode) {
      toast.info("This message is already in the selected language.");
      return;
    }

    const toastId = toast.loading("Translating message...");

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${assumedOriginal}|${langCode}`
      );

      const data = await res.json();

      if (data?.responseStatus !== 200) {
        throw new Error(data?.responseDetails || "Translation failed.");
      }

      toast.success(data?.responseData?.translatedText, {
        id: toastId,
      });

    } catch (err) {
      toast.error(
        err?.message || "We couldn’t translate the message. Please try again.",
        { id: toastId }
      );
    }
  };


  /** Delete handler (keeps dialog until done) */
  const runDelete = async () => {
    if (!alertType?.id) return;

    const toastId = toast.loading("Deleting message...");

    try {
      await deleteMessage(alertType.id, alertType.mode === "everyone");

      toast.success(
        alertType.mode === "everyone"
          ? "The message has been deleted for everyone."
          : "The message has been deleted for you.",
        { id: toastId }
      );

    } catch (err) {
      toast.error(
        err?.message || "We couldn’t delete the message. Please try again.",
        { id: toastId }
      );
    } finally {
      setAlertType(null);
      onClose?.();
    }
  };

  /** Copy handler */
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied to clipboard.");
    } catch {
      toast.success("Message copied to clipboard.");
    }
    onClose?.();
  };

  /** File download handler */
  const doDownload = async () => {
    if (!attachments.length) return;

    try {
      for (const att of attachments) {
        const url =
          att.cloudinary?.secure_url ||
          att.cloudinary?.url ||
          att.url;

        if (!url) continue;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch file");

        const blob = await response.blob();

        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = blobUrl;
        a.download = att.filename || "file";

        document.body.appendChild(a);
        a.click();

        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      }

      toast.success("Download has started.");
    } catch (err) {
      console.error(err);
      toast.error("We couldn’t download the file. Please try again.");
    }

    onClose?.();
  };


  const primaryLang = profile?.primaryLanguage;
  const secondaryLang = profile?.secondaryLanguage;

  return (
    <>
      <div className="py-2 min-w-[230px] bg-card border shadow-xl rounded-xl animate-in zoom-in-95 fade-in-80">

        {/* COPY */}
        {canCopy && <MenuItem icon={Copy} label="Copy" onClick={doCopy} />}

        {/* TRANSLATION OPTIONS */}
        {canCopy && primaryLang && (
          <MenuItem
            icon={Globe}
            label={`Translate (${getLangName(primaryLang)})`}
            onClick={() => doTranslate(primaryLang)}
          />
        )}

        {canCopy && secondaryLang && (
          <MenuItem
            icon={Globe}
            label={`Translate (${getLangName(secondaryLang)})`}
            onClick={() => doTranslate(secondaryLang)}
          />
        )}

        {/* DOWNLOAD */}
        {hasMedia && (
          <MenuItem
            icon={ArrowDownToLine}
            label="Download"
            onClick={doDownload}
          />
        )}

        {(canCopy || hasMedia) && <Divider />}

        {/* REPLY */}
        <MenuItem
          icon={Reply}
          label="Reply"
          onClick={() => {
            setReplyTo(message);
            onClose?.();
          }}
        />

        {/* PIN */}
        <MenuItem
          icon={Pin}
          label={pinned ? "Unpin" : "Pin"}
          onClick={async () => {
            const toastId = toast.loading(
              pinned ? "Unpinning message..." : "Pinning message..."
            );
            try {
              if (pinned) {
                await unpinMessage(chatId, _id);
                toast.success("Message has been unpinned.", { id: toastId });
              } else {
                await pinMessage(chatId, _id);
                toast.success("Message has been pinned.", { id: toastId });
              }
            } catch (err) {
              toast.error(
                err?.message || "We couldn’t update the pin status.",
                { id: toastId }
              );
            }
            onClose?.();
          }}
        />

        {/* INFO */}
        {isOwn && <MenuItem
          icon={Info}
          label="Message Info"
          onClick={() => {
            onClose?.();
            onShowInfo?.();
          }}
        />}

        <Divider />

        {/* DELETE FOR ME */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <MenuItem
              icon={Trash2}
              label="Delete for me"
              danger
              onClick={() => setAlertType({ id: _id, mode: "me" })}
            />
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this message?</AlertDialogTitle>
              <AlertDialogDescription>
                It will be removed only from your chat.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel
                className="px-2"
                disabled={deletingMessageId === _id}
              >
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                className="bg-destructive hover:bg-destructive px-2"
                onClick={runDelete}
                disabled={deletingMessageId === _id}
              >
                {deletingMessageId === _id ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  "Yes, delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* DELETE FOR EVERYONE */}
        {/* DELETE FOR EVERYONE */}
        {(isOwn || (isGroup && isAdmin)) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <MenuItem
                icon={Trash2}
                label="Delete for everyone"
                danger
                onClick={() => setAlertType({ id: _id, mode: "everyone" })}
              />
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete for everyone?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the message from everyone's chat.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel className="px-2" disabled={deletingMessageId === _id}>
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive px-2"
                  onClick={runDelete}
                  disabled={deletingMessageId === _id}
                >
                  {deletingMessageId === _id ? (
                    <Loader2 className="animate-spin size-4" />
                  ) : (
                    "Yes, delete for everyone"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Divider />
      </div>
    </>
  );
}

export default function MessageMenu({ children, message, isOwn, open, onOpenChange, onShowInfo }) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="center"
        sideOffset={6}
        className="overflow-hidden rounded-xl p-0 shadow-2xl"
      >
        <MenuBody
          message={message}
          isOwn={isOwn}
          onClose={() => onOpenChange?.(false)}
          onShowInfo={onShowInfo}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

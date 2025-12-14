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

    if (!text) return toast.error("Nothing to translate");

    // prevent same language calls
    const assumedOriginal = "en"; // assume your chat language base is English
    if (assumedOriginal === langCode) {
      toast.info("The message is already in this language");
      return;
    }

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${assumedOriginal}|${langCode}`
      );
      const data = await res.json();

      if (data?.responseStatus !== 200) {
        toast.error(data?.responseDetails || "Translation failed");
        return;
      }

      toast.info(data?.responseData?.translatedText || "No translation found");
    } catch {
      toast.error("Translate failed");
    }
  };


  /** Delete handler (keeps dialog until done) */
  const runDelete = async () => {
    if (!alertType?.id) return;

    try {
      await deleteMessage(alertType.id, alertType.mode === "everyone");
      toast.success(
        alertType.mode === "everyone"
          ? "Deleted for everyone"
          : "Deleted for you"
      );
    } catch {
      toast.error("Delete failed");
    } finally {
      setAlertType(null);
      onClose?.(); // close AFTER completing delete
    }
  };

  /** Copy handler */
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
    onClose?.();
  };

  /** File download handler */
  const doDownload = () => {
    attachments.forEach((att) => {
      const url =
        att.cloudinary?.secure_url || att.cloudinary?.url || att.url;
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = att.filename || "file";
        a.click();
      }
    });
    toast.success("Download started");
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
            try {
              pinned
                ? await unpinMessage(chatId, _id)
                : await pinMessage(chatId, _id);
            } catch {
              toast.error("Pin failed");
            }
            onClose?.();
          }}
        />

        {/* INFO */}
        <MenuItem
          icon={Info}
          label="Message Info"
          onClick={() => {
            onClose?.();
            onShowInfo?.();
          }}
        />

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
                className="px-1"
                disabled={deletingMessageId === _id}
              >
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                className="bg-destructive hover:bg-destructive px-1"
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
        {isOwn && (
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
                <AlertDialogCancel
                  className="px-1"
                  disabled={deletingMessageId === _id}
                >
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive px-1"
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

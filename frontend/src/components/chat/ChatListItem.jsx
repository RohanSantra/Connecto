// src/components/chat/ChatListItem.jsx
"use client";

import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Pin, Trash2, EllipsisVertical, Check, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";
import { formatDistanceToNowStrict } from "date-fns";
import { getMessageStatusIcon } from "@/lib/messagePreview";
import { Button } from "../ui/button";

// 🔥 Alert Dialog imports
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

/* -----------------------------------
   Detect file kind
----------------------------------- */
function detectKind(att) {
  if (!att) return null;
  const mime = (att.mimeType || att.mimetype || att.type || "").toString();
  const name = String(att.filename || att.originalName || "");
  const ext = (name.split(".").pop() || "").toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const images = ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif"];
  const videos = ["mp4", "mov", "mkv", "webm"];
  const audios = ["mp3", "m4a", "aac", "ogg", "wav", "flac", "opus"];

  if (images.includes(ext)) return "image";
  if (videos.includes(ext)) return "video";
  if (audios.includes(ext)) return "audio";

  return "file";
}

/* Mini-thumb strip */
function MiniThumbStrip({ message }) {
  const atts = Array.isArray(message?.attachments) ? message.attachments : [];
  if (!atts.length) return null;

  const visible = atts.slice(0, 3);

  return (
    <div className="flex -space-x-1.5 ml-1 shrink-0">
      {visible.map((att, idx) => {
        const kind = detectKind(att);
        const src = att?.cloudinary?.secure_url || att?.cloudinary?.url || att?.url || "";

        if (kind === "image") {
          return (
            <img
              key={idx}
              src={src}
              alt={att.filename}
              className="h-4 w-4 rounded object-cover border border-background shadow-sm"
            />
          );
        }

        if (kind === "video") {
          return (
            <div
              key={idx}
              className="h-4 w-4 rounded bg-background/70 text-[8px] flex items-center justify-center border border-background shadow-sm"
            >
              🎬
            </div>
          );
        }

        if (kind === "audio") {
          return (
            <div
              key={idx}
              className="h-4 w-4 rounded bg-purple-200 text-[8px] flex items-center justify-center border border-background shadow-sm"
            >
              🔊
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="h-4 w-4 rounded bg-muted text-[8px] flex items-center justify-center border border-background shadow-sm"
          >
            📄
          </div>
        );
      })}

      {atts.length > 3 && (
        <div className="h-4 w-4 rounded-full bg-muted text-[9px] flex items-center justify-center border border-background shadow-sm">
          +{atts.length - 3}
        </div>
      )}
    </div>
  );
}

/* Summary of attachments */
function buildMediaSummary(atts = []) {
  if (!atts.length) return "";

  let img = 0,
    vid = 0,
    aud = 0,
    file = 0;

  atts.forEach((att) => {
    const k = detectKind(att);
    if (k === "image") img++;
    else if (k === "video") vid++;
    else if (k === "audio") aud++;
    else file++;
  });

  const parts = [];
  if (img) parts.push(img === 1 ? "Photo" : `${img} photos`);
  if (vid) parts.push(vid === 1 ? "Video" : `${vid} videos`);
  if (aud) parts.push(aud === 1 ? "Audio" : `${aud} audios`);
  if (file) parts.push(file === 1 ? "File" : `${file} files`);

  return parts.join(" • ");
}

/* Preview text builder */
function buildPreview(last, { isTyping, typingText }) {
  if (!last && !isTyping) return "No messages yet";
  if (isTyping) return typingText;

  if (last?.isDeleted) return "Message deleted";

  const attachments = Array.isArray(last?.attachments) ? last.attachments : [];

  const textCandidate =
    last?.content ||
    last?.plaintext ||
    last?.preview ||
    last?.snippet ||
    last?.text ||
    "";

  const trimmed = (textCandidate + "").trim();
  const hasText = Boolean(trimmed);
  const hasAttachments = attachments.length > 0;

  if (!hasText && hasAttachments) {
    return buildMediaSummary(attachments) || "Media";
  }

  if (hasText) {
    return trimmed.length > 60 ? trimmed.slice(0, 60) + "…" : trimmed;
  }

  return "No messages yet";
}

/* simple highlight util */
function highlightMatches(text = "", query = "") {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return text;

  const idx = lower.indexOf(q);
  if (idx !== -1) {
    return [
      text.slice(0, idx),
      <mark key="h1" className="bg-primary/90 px-0.5 rounded">
        {text.slice(idx, idx + q.length)}
      </mark>,
      text.slice(idx + q.length),
    ];
  }
  return text;
}

/* -----------------------------------
   MAIN COMPONENT
----------------------------------- */
export default function ChatListItem({ chat = {}, onClick, searchTerm = "" }) {
  const { togglePin, deleteChat, activeChatId, typing } = useChatStore();
  const { profile } = useProfileStore();

  const isGroup = chat.isGroup;
  const isActive = activeChatId === chat.chatId;

  const participants = chat.participants || [];
  const otherUser = !isGroup
    ? chat.otherUser ||
    participants.find((p) => String(p.userId) !== String(profile?.userId))
    : null;

  const chatName = isGroup ? chat.name : otherUser?.username || "Unknown";
  const avatarUrl = isGroup ? chat.groupAvatarUrl : otherUser?.avatarUrl;
  const isOnline = !isGroup && otherUser?.isOnline;

  const last = chat.lastMessage || {};

  const tMap = typing?.[chat.chatId] || {};
  const otherId = otherUser?.userId ? String(otherUser.userId) : null;
  const isTyping = isGroup ? Object.keys(tMap).length > 0 : !!tMap[otherId];
  const typingText = isGroup ? "Someone is typing…" : "typing…";

  const rawPreview = buildPreview(last, { isTyping, typingText });
  const preview = highlightMatches(rawPreview, searchTerm);
  const highlightedName = highlightMatches(chatName, searchTerm);

  const lastAt = last.createdAt
    ? formatDistanceToNowStrict(new Date(last.createdAt), {
      addSuffix: true,
    })
    : "";

  const msgStatus = getMessageStatusIcon(last, profile);
  const tick =
    msgStatus === "read" ? (
      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
    ) : msgStatus === "delivered" ? (
      <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
    ) : msgStatus === "sent" ? (
      <Check className="w-3.5 h-3.5 text-muted-foreground" />
    ) : null;

  const hasAttachments = Array.isArray(last?.attachments) && last.attachments.length > 0;


  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        // fixed avatar column (48px), flexible middle, right auto
        "w-full grid grid-cols-[48px_1fr_auto] gap-3 p-3 rounded-xl",
        "transition-all focus:outline-none overflow-hidden cursor-pointer",
        isActive ? "bg-accent/70 border border-border" : "hover:bg-accent/40"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11 rounded-xl">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{(chatName || "?")[0]}</AvatarFallback>
        </Avatar>
        {!isGroup && isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </div>

      {/* Middle */}
      <div className="min-w-0">
        <div className="flex justify-between items-start gap-2">
          <span className="text-sm font-semibold truncate">{highlightedName}</span>
          <span className="text-[11px] ml-2 text-muted-foreground whitespace-nowrap">
            {lastAt}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 min-w-0 overflow-hidden">
          {/* tick */}
          <div className="shrink-0 mr-0" aria-hidden>
            {tick}
          </div>

          {/* thumbnails */}
          {hasAttachments && <MiniThumbStrip message={last} />}

          {/* preview */}
          <span className="text-xs text-muted-foreground truncate w-full block">
            {preview}
          </span>
        </div>
      </div>

      {/* Right column: badge (top) + menu (bottom) */}
      <div className="relative flex items-start justify-end shrink-0 w-8">

        {/* unread badge */}
        {Number(chat?.unreadCount) > 0 && (
          <span
            className={cn(
              "absolute -top-1 right-2",
              "inline-flex min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold",
              "bg-primary text-primary-foreground",
              "items-center justify-center leading-none shadow-sm"
            )}
            title={chat.unreadCount > 99 ? "99+" : String(chat.unreadCount)}
          >
            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
          </span>
        )}

        {/* menu button */}
        <div className="absolute bottom-0 right-0">
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="p-1 hover:bg-accent rounded-lg">
                  <EllipsisVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="left" align="end" className="w-44">
                <DropdownMenuItem onClick={() => togglePin(chat.chatId, chat.pinned)}>
                  <Pin className="w-4 h-4 mr-2" /> {chat.pinned ? "Unpin chat" : "Pin chat"}
                </DropdownMenuItem>

                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete chat
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent className="rounded-xl shadow-xl border">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will lose messages, media, and history for this chat.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 rounded-lg"
                  onClick={() => deleteChat(chat.chatId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

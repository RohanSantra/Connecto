// src/components/chat/PinnedMessagesBar.jsx
import React, { useState } from "react";
import {
  X,
  Pin,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMessageStore } from "@/store/useMessageStore";
import { badgeFor } from "@/lib/fileBadge";
import { detectKind } from "@/lib/detectKind";
/* ---------- Kind helpers (shared with message/media logic) ---------- */


/** Count attachment types for summary + icon */
function summarizeAttachments(message = {}) {
  const atts = Array.isArray(message.attachments)
    ? message.attachments
    : [];

  const summary = {
    total: atts.length,
    image: 0,
    video: 0,
    audio: 0,
    file: 0,
  };

  atts.forEach((att) => {
    const k = detectKind(att);
    if (k === "image") summary.image += 1;
    else if (k === "video") summary.video += 1;
    else if (k === "audio") summary.audio += 1;
    else summary.file += 1;
  });

  return summary;
}

/* ---------- Preview text (handles text + mixed media) ---------- */

function getPreview(message) {
  if (!message) return "(Message)";

  // Text message
  if (message.type === "text") {
    if (!message.plaintext) return "(Unable to decrypt)";
    const text = message.plaintext.trim();
    if (!text) return "(Empty)";
    return text.length > 60 ? text.slice(0, 60) + "…" : text;
  }

  // Attachment message
  const { image, video, audio, file, total } = summarizeAttachments(message);

  if (total === 0) return "(Message)";

  const parts = [];

  if (image) parts.push(image === 1 ? "Photo" : `${image} photos`);
  if (video) parts.push(video === 1 ? "Video" : `${video} videos`);
  if (audio) parts.push(audio === 1 ? "Audio" : `${audio} audios`);
  if (file) parts.push(file === 1 ? "File" : `${file} files`);

  // Example: "Photo • Audio • 2 files"
  return parts.join(" • ");
}

/* ---------- Icon chooser (handles mixed media) ---------- */

function getIcon(message) {
  const { image, video, audio, file, total } = summarizeAttachments(message);

  if (!total) {
    return <Pin className="w-3.5 h-3.5 text-primary" />;
  }

  // Prefer "richer" media first
  if (image && !video && !audio && !file) {
    return <ImageIcon className="w-3.5 h-3.5 text-primary/70" />;
  }
  if (video && !image && !audio && !file) {
    return <Video className="w-3.5 h-3.5 text-primary/70" />;
  }
  if (audio && !image && !video && !file) {
    return <Mic className="w-3.5 h-3.5 text-primary/70" />;
  }

  // Mixed attachments → small generic "media" feel using FileText
  return <FileText className="w-3.5 h-3.5 text-primary/70" />;
}

/* ---------- Tiny attachment chips for expanded view ---------- */

function AttachmentChips({ message }) {
  const atts = Array.isArray(message.attachments)
    ? message.attachments
    : [];
  if (!atts.length) return null;

  // Only show up to 3 small chips
  const first = atts.slice(0, 3);

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {first.map((att, idx) => {
        const kind = detectKind(att);
        const badge = badgeFor(att.filename || "file", kind);
        const label =
          badge?.label ||
          (kind === "image"
            ? "IMG"
            : kind === "video"
            ? "VID"
            : kind === "audio"
            ? "AUD"
            : "FILE");

        return (
          <span
            key={`${att._id || att.filename || idx}-chip`}
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border bg-muted/60",
              badge?.className
            )}
          >
            {label}
          </span>
        );
      })}

      {atts.length > 3 && (
        <span className="text-[10px] text-muted-foreground">
          +{atts.length - 3} more
        </span>
      )}
    </div>
  );
}

/* ---------- Scroll highlight with bounce ---------- */

function scrollToMessage(id) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.classList.add(
    "bg-primary/10",
    "rounded-md",
    "animate-[pulse_1s_ease-out_1]"
  );

  setTimeout(() => {
    el.classList.add("animate-[bounce_400ms_ease-out_1]");
  }, 200);

  setTimeout(() => {
    el.classList.remove(
      "bg-primary/10",
      "animate-[pulse_1s_ease-out_1]",
      "animate-[bounce_400ms_ease-out_1]"
    );
  }, 1400);
}

/* ========================================================================
   PinnedMessagesBar
   - Collapsed row with chips
   - Expanded list with richer info + attachment chips
   - Correct icons & preview for mixed attachments
========================================================================= */

export default function PinnedMessagesBar({ pinnedMessages = [] }) {
  const { unpinMessage } = useMessageStore();
  const [open, setOpen] = useState(false); // collapsed initially

  if (!pinnedMessages.length) return null;

  return (
    <div className="border-b bg-muted/30 backdrop-blur-sm px-3 py-2 shadow-sm">
      {/* Header row (toggle) */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-1">
          <Pin className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            {pinnedMessages.length} pinned message
            {pinnedMessages.length > 1 ? "s" : ""}
          </span>
        </div>

        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Collapsed — horizontal chips */}
      {!open && (
        <div className="flex gap-2 overflow-x-auto scroll-thumb-only py-1 mt-1">
          {pinnedMessages.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => scrollToMessage(m._id)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-2 bg-background border rounded-md shadow-sm hover:bg-accent/50 transition cursor-pointer shrink-0 max-w-[230px]"
            >
              <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                {getIcon(m)}
              </div>

              <div className="flex flex-col min-w-0 text-left">
                <p className="text-[11px] text-foreground/80 line-clamp-1">
                  {getPreview(m)}
                </p>
                {m.attachments?.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    {m.attachments.length} attachments
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Expanded — full list with chips & actions */}
      {open && (
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto scroll-thumb-only pr-1 mt-2 animate-[fadeIn_0.18s_ease-out]">
          {pinnedMessages.map((m) => {
            const senderName =
              m.senderProfile?.username ||
              m.sender?.username ||
              "User";

            return (
              <div
                key={m._id}
                className="flex items-center justify-between gap-3 px-3 py-2 bg-background rounded-md shadow-sm border hover:bg-accent/60 transition"
              >
                {/* Left side: info + click to scroll */}
                <button
                  type="button"
                  onClick={() => scrollToMessage(m._id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                    {getIcon(m)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">
                      {senderName}
                    </p>
                    <p className="text-sm text-foreground/90 line-clamp-1">
                      {getPreview(m)}
                    </p>
                    {/* mini attachment badges (IMG / AUDIO / PDF etc.) */}
                    <AttachmentChips message={m} />
                  </div>
                </button>

                {/* Unpin */}
                <button
                  type="button"
                  onClick={() => unpinMessage(m.chatId, m._id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

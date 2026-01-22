"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Reply as ReplyIcon,
  SmilePlus,
  Pin as PinIcon,
  PinOff,
  Play,
  Download,
  Eye,
  FileText,
  Loader2,
} from "lucide-react";
import MessageMenu from "./MessageMenu";
import QuickReactions from "./QuickReactions";
import MessageInfoPanel from "./MessageInfoPanel";
import EmojiInfoPanel from "./EmojiInfoPanel";
import { useMessageStore } from "@/store/useMessageStore";
import { useProfileStore } from "@/store/useProfileStore";
import { badgeFor } from "@/lib/fileBadge";
import {
  FullscreenGallery,
} from "./MediaGalleryManager";
import SeekableWaveform from "./SeekableWaveform";
import { buildReplyPreviewText } from "@/lib/replyPreview";
import { detectKind } from "@/lib/detectKind";
import FileViewer from "./FileViewer";
import formatSize from "@/lib/formatSize.js"

const SHOW_MORE = 350;

const Time = ({ createdAt }) => (
  <span className="text-[11px] leading-none text-[var(--chat-meta)]">
    {createdAt ? format(new Date(createdAt), "hh:mm a") : ""}
  </span>
);

const Tick = ({ state }) => {
  if (state === "sending") {
    return (
      <Loader2 className="w-4 h-4 animate-spin text-[var(--chat-meta)]" />
    );
  }
  if (state === "read")
    return <CheckCheck className="w-4 h-4 text-[var(--color-primary)]" />;
  if (state === "delivered")
    return <CheckCheck className="w-4 h-4 text-[var(--chat-meta)]" />;
  if (state === "sent")
    return <Check className="w-4 h-4 text-[var(--chat-meta)]" />;
  return null;
};

function idOf(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (entry.userId) return String(entry.userId);
  if (entry.user) return String(entry.user);
  if (entry._id) return String(entry._id);
  return null;
}

function computeTickState({ isOwn, deliveredTo = [], readBy = [], currentUserId }) {
  if (!isOwn) return null;
  const me = currentUserId ? String(currentUserId) : null;

  const readIds = (Array.isArray(readBy) ? readBy : [])
    .map(idOf)
    .filter(Boolean)
    .filter((id) => id !== me);

  if (readIds.length > 0) return "read";

  const deliveredIds = (Array.isArray(deliveredTo) ? deliveredTo : [])
    .map(idOf)
    .filter(Boolean)
    .filter((id) => id !== me);

  if (deliveredIds.length > 0) return "delivered";
  return "sent";
}

export function getMediaSrc(att) {
  return (
    att?.cloudinary?.secure_url ||
    att?.cloudinary?.url ||
    att?.url ||
    att?.secure_url ||
    ""
  );
}

/* AttachmentBubble */
function AttachmentBubble({
  att,
  compact = false,
  index = 0,
  openFullscreen,
  isMediaIndex = false,
  setFileViewerFile,
  isSending = false,
  isOwn
}) {
  const src = getMediaSrc(att);
  const kind = detectKind(att);
  const name = att?.filename || "file";
  const size = att?.size || 0;
  const isImg = kind === "image";
  const isVideo = kind === "video";
  const isAudio = kind === "audio";
  const [duration, setDuration] = useState(att?.duration || null);

  useEffect(() => {
    if (isVideo && src) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = src;
      const onLoaded = () => {
        const d = v.duration;
        if (!isNaN(d) && isFinite(d)) {
          const mins = Math.floor(d / 60);
          const secs = Math.round(d % 60)
            .toString()
            .padStart(2, "0");
          setDuration(`${mins}:${secs}`);
        }
      };
      v.addEventListener("loadedmetadata", onLoaded);
      return () => v.removeEventListener("loadedmetadata", onLoaded);
    }
  }, [isVideo, src]);


  const handlePreview = (e) => {
    if (isSending) return;
    e?.stopPropagation?.();

    if (isImg || isVideo) {
      if (openFullscreen && isMediaIndex) {
        openFullscreen(index);
        return;
      }
      window.open(src, "_blank");
      return;
    }

    // For PDF, DOC, PPT, ZIP → open FileViewer
    if (typeof att === "object" && att.cloudinary) {
      setFileViewerFile(att);
      return;
    }

    // fallback
    if (src) window.open(src, "_blank");
  };


  const badge = badgeFor(name, kind);

  if (isImg) {
    return (
      <div
        className={cn(
          "rounded-xl overflow-hidden shadow-md cursor-pointer relative",
          isOwn
            ? "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)]"
            : "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)]",
          compact ? "w-40 h-40" : "w-64 h-64"
        )}
        onClick={handlePreview}
      >
        <img
          src={src}
          alt={name}
          className="object-cover w-full h-full"
          draggable={false}
        />
        {badge && (
          <span
            className={cn(
              "absolute left-2 top-2 px-2 py-0.5 rounded-xl text-[10px] font-medium shadow",
              badge.className
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div
        className={cn(
          "relative rounded-xl overflow-hidden shadow-md cursor-pointer",
          isOwn
            ? "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)]"
            : "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)]",
          compact ? "w-56 h-32" : "w-64 h-40"
        )}
        onClick={handlePreview}
      >
        <video
          src={src}
          className="object-cover w-full h-full"
          muted
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-[var(--chat-other-bg)/50] p-2">
            <Play className="w-10 h-10 text-[var(--chat-meta)]" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-[var(--chat-other-bg)/70] px-2 rounded-xl text-xs text-[var(--chat-meta)]">
          {duration || "0:00"}
        </div>
        {badge && (
          <span
            className={cn(
              "absolute left-2 top-2 px-2 py-0.5 rounded-xl text-[10px] font-medium shadow",
              badge.className
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
    );
  }

  if (isAudio) {
    return (
      <div
        className={cn(isOwn
          ? "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)] border-[var(--chat-border)]"
          : "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)] border-[var(--chat-border)]",
          "shadow-sm rounded-xl border px-3 py-3 w-80 flex flex-col")}
      >
        <div className="flex items-center gap-3">
          <div
            onClick={(e) => e.stopPropagation()} // prevent opening preview
            className="w-full max-w-60"
          >
            <SeekableWaveform
              src={src}
              barCount={48}
              height={50}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs truncate text-[var(--chat-meta)]">
            {name} • {formatSize(size)}
          </div>
          {badge && (
            <span className={cn("ml-2 px-2 py-0.5 rounded-xl text-[12px] font-medium", badge.className)}>
              {badge.label}
            </span>
          )}
        </div>
      </div>
    );
  }


  return (
    <div
      className={cn(isOwn
        ? "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)] shadow-md"
        : "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)] shadow-md",
        "shadow-md rounded-xl border border-[var(--chat-border)] px-4 py-3 w-80 flex flex-col gap-2 h-fit cursor-pointer")}
      onClick={handlePreview}
    >
      <div className="flex items-center gap-3">
        {badge ? (
          <span
            className={cn(
              "inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-semibold",
              badge.className
            )}
          >
            {badge.label}
          </span>
        ) : (
          <FileText className="w-9 h-9 text-[var(--chat-meta)]" />
        )}

        <div className="flex-1 min-w-0">
          <div className="truncate font-medium text-sm">{name}</div>
          <div className="text-xs text-[var(--chat-meta)] mt-0.5">
            {formatSize(size)}
          </div>
        </div>
      </div>

      {/* Actions (hidden while sending) */}
      {!isSending && (
        <div className="flex gap-2 mt-1">
          <a
            href={getMediaSrc(att)}
            download
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs border rounded-md px-2 py-1 bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/70 flex items-center gap-1"
          >
            <Download className="w-4 h-4 inline-block mr-1" /> Download
          </a>

          <button
            type="button"
            onClick={handlePreview}
            className="text-xs border rounded-md px-2 py-1 bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/70 flex items-center gap-1"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
        </div>
      )}

    </div>
  );
}

/* MessageItem main */
export default React.memo(
  function MessageItem({ message = {}, isOwn }) {
    const {
      plaintext,
      attachments = [],
      createdAt,
      deliveredTo = [],
      readBy = [],
      replyTo,
      reactions = [],
      pinned,
      _id,
      chatId,
    } = message || {};
    const { setReplyTo, pinMessage, unpinMessage, setScrollToMessage } = useMessageStore();
    const { profile } = useProfileStore();
    const currentUserId = profile?.userId;

    /** ---- Delete State ---- **/
    const isDeletedForAll = !!message.deleted;
    const deletedForArr = Array.isArray(message.deletedFor)
      ? message.deletedFor.map(String)
      : [];
    const deletedForMe = currentUserId
      ? deletedForArr.includes(String(currentUserId))
      : false;

    const showPersonalTombstone = deletedForMe && !isDeletedForAll;

    const bubbleRef = useRef(null);
    const [expanded, setExpanded] = useState(false);
    const [showReact, setShowReact] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [emojiInfoOpen, setEmojiInfoOpen] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState(null);

    const [fullscreenOpen, setFullscreenOpen] = useState(false);
    const [fullscreenIndex, setFullscreenIndex] = useState(0);
    const [fileViewerFile, setFileViewerFile] = useState(null);

    const reactionGroups = useMemo(() => {
      const map = new Map();
      (reactions || []).forEach((r) => {
        const em = r.reaction || r.emoji || r.reactionEmoji;
        if (!em) return;
        const arr = map.get(em) || [];
        arr.push(r);
        map.set(em, arr);
      });
      return Array.from(map.entries()).map(([emoji, arr]) => ({
        emoji,
        users: arr,
        count: arr.length,
      }));
    }, [reactions]);

    const [isTouch, setIsTouch] = useState(false);
    const [isSmall, setIsSmall] = useState(false);

    useEffect(() => {
      const touch =
        typeof window !== "undefined" &&
        ("ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0);
      setIsTouch(!!touch);
    }, []);


    useEffect(() => {
      const check = () => setIsSmall(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);

    const long = plaintext && plaintext.length > SHOW_MORE;
    const displayed =
      expanded || !long ? plaintext : plaintext?.slice(0, SHOW_MORE) + "…";

    const ticks = useMemo(
      () => {
        if (!isOwn) return null;

        if (message.status === "sending") return "sending";
        if (message.status === "failed") return null;

        return computeTickState({
          isOwn,
          deliveredTo: deliveredTo || [],
          readBy: readBy || [],
          currentUserId,
        });
      },
      [isOwn, deliveredTo, readBy, currentUserId, message.status]
    );


    const handleReply = useCallback(
      (e) => {
        e?.stopPropagation?.();
        setReplyTo(message);
      },
      [message, setReplyTo]
    );

    const handlePinToggle = useCallback(
      async (e) => {
        e?.stopPropagation?.();
        try {
          if (pinned) await unpinMessage(chatId, _id);
          else await pinMessage(chatId, _id);
        } catch (err) {
          console.warn("Pin failed", err);
        }
      },
      [pinned, pinMessage, unpinMessage, chatId, _id]
    );


    const hasText = Boolean(plaintext && plaintext.trim());
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    const isSending = isOwn && message.status === "sending";


    // MEDIA LIST
    const mediaAttachments = useMemo(
      () =>
        attachments.filter((a) => {
          const k = detectKind(a);
          return k === "image" || k === "video";
        }),
      [attachments]
    );

    const mediaIndexMap = useMemo(() => {
      const map = new Map();
      mediaAttachments.forEach((m, idx) =>
        map.set(getMediaSrc(m) + (m.filename || ""), idx)
      );
      return map;
    }, [mediaAttachments]);

    const onlyImages =
      hasAttachments && attachments.every((a) => detectKind(a) === "image");

    const openFullscreenAt = useCallback((mediaIdx) => {
      setFullscreenIndex(mediaIdx || 0);
      setFullscreenOpen(true);
    }, []);


    return (
      <div
        id={`msg-${_id}`}
        className={cn("flex mb-5 mx-2", isOwn ? "justify-end" : "justify-start")}
      >
        <div className="relative max-w-[78%] group overflow-visible z-0">
          {pinned && (
            <div
              className={cn(
                "absolute -top-3 z-30 inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium",
                isOwn
                  ? "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)] shadow-md"
                  : "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)] shadow-md"
              )}
              style={{ transform: "translateY(-4px)" }}
            >
              <PinIcon className="w-3 h-3" />
              <span className="hidden md:inline">Pinned</span>
            </div>
          )}

          {/* Big device action bar */}
          {!(isSmall || isTouch) && !isDeletedForAll && (
            <div
              className={cn(
                "hidden md:flex absolute -top-10 gap-2 px-2 py-1 rounded-xl shadow-lg z-20",
                "bg-[var(--color-card)]/95 backdrop-blur-sm transition-all duration-150 opacity-0 md:group-hover:opacity-100",
                isOwn ? "right-0" : "left-0"
              )}
              style={{
                transformOrigin: isOwn ? "right center" : "left center",
              }}
              aria-hidden
            >
              <button
                onClick={handleReply}
                className="p-1 rounded-xl hover:bg-[var(--color-muted)]/40"
                aria-label="Reply"
                title="Reply"
              >
                <ReplyIcon className="w-4 h-4 text-[var(--chat-meta)]" />
              </button>

              <button
                onClick={() => setShowReact((s) => !s)}
                className="p-1 rounded-xl hover:bg-[var(--color-muted)]/40"
                aria-label="React"
                title="React"
              >
                <SmilePlus className="w-4 h-4 text-[var(--chat-meta)]" />
              </button>

              <button
                onClick={handlePinToggle}
                className={cn(
                  "p-1 rounded-xl hover:bg-[var(--color-muted)]/40",
                  pinned && "text-[var(--color-primary)]"
                )}
                aria-label={pinned ? "Unpin message" : "Pin message"}
                title={pinned ? "Unpin" : "Pin"}
              >
                {pinned ?
                  <PinOff className="w-4 h-4 text-[var(--chat-meta)]" /> :
                  <PinIcon className="w-4 h-4 text-[var(--chat-meta)]" />
                }
              </button>

              <MessageMenu
                message={message}
                isOwn={isOwn}
                onShowInfo={() => setInfoOpen(true)}
                open={menuOpen}
                onOpenChange={setMenuOpen}
              >
                <button
                  className="p-1 rounded-xl hover:bg-[var(--color-muted)]/40"
                  aria-label="More"
                  title="More"
                >
                  <MoreHorizontal className="w-4 h-4 text-[var(--chat-meta)]" />
                </button>
              </MessageMenu>
            </div>
          )}

          {/* Small device action bar */}
          {(isSmall || isTouch) && !isDeletedForAll && (
            <div
              className={cn(
                "absolute flex items-center gap-2 px-2 py-1 z-50 top-1/2 -translate-y-1/2",
                isOwn ? "right-full mr-2" : "left-full ml-2"
              )}
            >
              <button
                onClick={() => setShowReact((s) => !s)}
                className="p-1 rounded-lg bg-[var(--chat-other-bg)] border border-[var(--chat-other-fg)]/20 shadow-sm active:scale-95"
              >
                <SmilePlus className="w-4 h-4 text-[var(--chat-meta)]" />
              </button>

              <MessageMenu
                message={message}
                isOwn={isOwn}
                onShowInfo={() => setInfoOpen(true)}
                open={menuOpen}
                onOpenChange={setMenuOpen}
              >
                <button className="p-1 rounded-lg bg-[var(--chat-other-bg)] border border-[var(--chat-other-fg)]/20 shadow-sm active:scale-95">
                  <MoreHorizontal className="w-4 h-4 text-[var(--chat-meta)]" />
                </button>
              </MessageMenu>
            </div>
          )}



          {/* Deleted message tombstone */}
          {(isDeletedForAll || showPersonalTombstone) && (
            <div
              className={cn(
                "px-3 py-2 rounded-xl max-w-full text-xs italic opacity-80 border shadow-sm",
                isOwn
                  ? "bg-[var(--chat-own-bg)]/15 text-[var(--chat-own-fg)]/70 border border-[var(--color-primary)]/20"
                  : "bg-[var(--chat-other-bg)]/40 text-[var(--chat-other-fg)]/70 border border-[var(--chat-border)]/30"
              )}
            >
              {showPersonalTombstone
                ? "You deleted this message"
                : isOwn
                  ? "You deleted this message"
                  : "This message was deleted"}
            </div>
          )}

          {/* TEXT bubble */}
          {!showPersonalTombstone && !isDeletedForAll && hasText && (
            <div
              ref={bubbleRef}
              className={cn(
                "px-4 py-3 rounded-xl text-sm shadow-sm border max-w-full wrap-break-word z-10",
                isOwn
                  ? "bg-[var(--chat-own-bg)] text-[var(--chat-own-fg)]"
                  : "bg-[var(--chat-other-bg)] text-[var(--chat-other-fg)]",
                pinned ? "ring-1 ring-[var(--color-primary)]/30 ring-offset-1" : "",
                "border border-[var(--chat-border)]"
              )}
              role="article"
              aria-label="text message"
            >
              {replyTo && (
                <div
                  className="mb-2 border-l-2 pl-3 text-xs opacity-80 cursor-pointer hover:opacity-100 transition border-l-[var(--chat-border)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (message.replyMessage?._id) {
                      setScrollToMessage(message.replyMessage._id);
                    }
                  }}
                >
                  {message.replyMessage?.deleted ? (
                    <p className="italic opacity-75 text-[var(--chat-meta)]">
                      {String(message.replyMessage?.senderId) === String(currentUserId)
                        ? "You deleted this message"
                        : "This message was deleted"}
                    </p>
                  ) : (
                    <>
                      {/* Username */}
                      <p className="font-medium leading-tight text-[13px] text-[var(--chat-meta)]">
                        {message.replyMessage?.senderProfile?.username || "User"}
                      </p>

                      {/* NEW pinned-style preview text */}
                      <p className="truncate text-[12px] mt-1 opacity-90 text-[var(--chat-meta)]">
                        {buildReplyPreviewText(message.replyMessage)}
                      </p>
                    </>
                  )}
                </div>
              )}



              <p className="primaryspace-pre-wrap text-[14px] leading-relaxed">
                {displayed || (
                  <span className="text-[var(--chat-meta)]">(Unable to decrypt)</span>
                )}
              </p>

              {long && (
                <button
                  onClick={() => setExpanded((s) => !s)}
                  className="mt-2 text-xs underline underline-offset-2 text-[var(--chat-meta)]"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {/* Attachments */}
          {!showPersonalTombstone && !isDeletedForAll && hasAttachments && (
            <div
              className={cn(
                "mt-3 gap-3",
                onlyImages && attachments.length > 1
                  ? "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3"
                  : "flex flex-col gap-3"
              )}
            >
              {attachments.map((att, i) => {
                const key = getMediaSrc(att) + (att.filename || "");
                const mediaIdx = mediaIndexMap.get(key);
                const isMediaIndex =
                  typeof mediaIdx === "number" && mediaIdx >= 0;

                return (
                  <div
                    key={`${att.filename || att._id || i}-${i}`}
                    className={cn(isOwn ? "flex justify-end" : "flex justify-start")}
                  >
                    <AttachmentBubble
                      att={att}
                      compact={attachments.length > 1}
                      index={mediaIdx}
                      openFullscreen={openFullscreenAt}
                      isMediaIndex={isMediaIndex}
                      setFileViewerFile={setFileViewerFile}
                      isSending={isSending}
                      isOwn={isOwn}
                    />

                  </div>
                );
              })}
            </div>
          )}

          {/* Time & ticks */}
          {!showPersonalTombstone && !isDeletedForAll && (
            <div className={cn("flex items-center gap-1 mt-2 opacity-70", isOwn ? "justify-end" : "justify-start")}>
              <Time createdAt={createdAt} />
              {ticks && <Tick state={ticks} />}
            </div>
          )}

          {/* Reaction bubbles */}
          {!showPersonalTombstone && !isDeletedForAll && reactionGroups.length > 0 && (
            <div className={cn("flex gap-1 mt-2", isOwn ? "justify-end" : "justify-start")}>
              {reactionGroups.map((grp) => (
                <button
                  key={grp.emoji}
                  onClick={() => {
                    setSelectedEmoji(grp.emoji);
                    setEmojiInfoOpen(true);
                  }}
                  className="px-2 py-0.5 rounded-xl bg-[var(--chat-reaction-bg)] border border-[var(--chat-border)]/30 text-xs shadow hover:bg-[var(--chat-reaction-bg)]/60"
                >
                  <span className="text-[15px]">{grp.emoji}</span>
                  <span className="text-[11px] tabular-nums">{grp.count}</span>
                </button>
              ))}
            </div>
          )}

          {showReact && (
            <div
              className={cn(
                "absolute z-50 py-2 flex",
                isOwn
                  ? "-top-14 right-0"
                  : "-top-14 left-0"
              )}
            >
              <QuickReactions
                message={message}
                onClose={() => setShowReact(false)}
                parentRef={bubbleRef}
              />
            </div>
          )}


        </div>

        <MessageInfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} message={message} />

        <EmojiInfoPanel
          open={emojiInfoOpen}
          onClose={() => {
            setEmojiInfoOpen(false);
            setSelectedEmoji(null);
          }}
          emoji={selectedEmoji}
          message={message}
        />

        {fileViewerFile && (
          <FileViewer
            file={fileViewerFile}
            onClose={() => setFileViewerFile(null)}
          />
        )}

        {fullscreenOpen && mediaAttachments.length > 0 && (
          <FullscreenGallery
            items={mediaAttachments}
            index={fullscreenIndex}
            onClose={() => setFullscreenOpen(false)}
            selected={new Set()}
            onToggleSelect={() => { }}
            onDownloadZip={() => { }}
            withinParent={false}
          />
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.isOwn !== next.isOwn) return false;
    const a = prev.message || {};
    const b = next.message || {};

    if (String(a._id) !== String(b._id)) return false;
    if (String(a.updatedAt || "") !== String(b.updatedAt || "")) return false;

    if ((a.readBy?.length || 0) !== (b.readBy?.length || 0)) return false;
    if ((a.deliveredTo?.length || 0) !== (b.deliveredTo?.length || 0)) return false;
    if ((a.reactions?.length || 0) !== (b.reactions?.length || 0)) return false;
    if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) return false;
    if ((a.plaintext || "") !== (b.plaintext || "")) return false;
    if ((a.attachments?.length || 0) !== (b.attachments?.length || 0)) return false;
    if ((a.deleted ? 1 : 0) !== (b.deleted ? 1 : 0)) return false;

    const aDeletedForLen = Array.isArray(a.deletedFor) ? a.deletedFor.length : 0;
    const bDeletedForLen = Array.isArray(b.deletedFor) ? b.deletedFor.length : 0;
    if (aDeletedForLen !== bDeletedForLen) return false;

    return true;
  }
);

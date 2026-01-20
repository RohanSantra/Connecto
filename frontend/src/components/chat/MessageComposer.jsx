"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import {
  Paperclip,
  Smile,
  Send,
  Loader2,
  X,
  Mic,
  StopCircle,
  Camera,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from "@/components/ui/emoji-picker";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import { useMessageStore } from "@/store/useMessageStore";
import { useChatStore } from "@/store/useChatStore";
import { useProfileStore } from "@/store/useProfileStore";

import { encryptOutgoingMessage } from "@/lib/encryption";
import { sendTyping, stopTyping } from "@/lib/socket";
import SeekableWaveform from "./SeekableWaveform";
import { FullscreenGallery } from "./MediaGalleryManager";
import { badgeFor } from "@/lib/fileBadge";
import { normalizeLastMessage } from "@/lib/normalize";
import { getMediaSrc } from "./MessageItem";
import { detectKind } from "@/lib/detectKind";
import { buildReplyPreviewText } from "@/lib/replyPreview";

const MAX_FILES = 5;
const DEFAULT_TEXTAREA_HEIGHT = 38; // px
const MAX_TEXTAREA_HEIGHT = 160; // px

/* PREVIEW BUILDER (compatible with MediaGalleryManager) */
function toPreview(file) {
  try {
    const url = URL.createObjectURL(file);
    return {
      _id: `local-${file.name}-${file.size}-${Date.now()}`,
      id: `local-${file.name}-${file.size}-${Math.random()}`,
      file,
      url,
      type: file.type,
      mimeType: file.type,
      mimetype: file.type,
      filename: file.name,
      size: file.size,
      createdAt: Date.now(),
      isLocal: true,
    };
  } catch {
    return {
      _id: `local-${file.name}-${file.size}-${Date.now()}`,
      id: `local-${file.name}-${file.size}-${Math.random()}`,
      url: null,
      type: file.type,
      mimeType: file.type,
      mimetype: file.type,
      filename: file.name,
      size: file.size,
      createdAt: Date.now(),
      isLocal: true,
    };
  }
}

/* Small format helper for recording timer */
function formatTime(sec) {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

/* Simple bar renderer for live recording */
function RecordingWaveform({ bars = [], height = 32 }) {
  const barCount = bars.length || 24;
  const minH = Math.max(2, Math.round(height * 0.12));
  return (
    <div className="flex items-end gap-0.5 flex-1" style={{ height, minWidth: 0 }}>
      {Array.from({ length: barCount }).map((_, i) => {
        const v = bars[i] ?? 0.15;
        const h = Math.max(minH, Math.round(v * height));
        return (
          <div
            key={i}
            style={{
              width: 2,
              height: h,
              borderRadius: 2,
              background: "currentColor",
              opacity: 0.95,
            }}
          />
        );
      })}
    </div>
  );
}

/* ---- WAV encoder helper (AudioBuffer -> WAV blob) ---- */
function audioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const bufferLength = audioBuffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(wavBuffer);

  function writeString(dataview, offset, str) {
    for (let i = 0; i < str.length; i++) dataview.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, bufferLength, true);

  let offset = 44;
  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(audioBuffer.getChannelData(ch));
  const len = audioBuffer.length;
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

/* ---- Main composer ---- */
export default function MessageComposer({ chatId }) {
  const { sendMessage, replyTo, setReplyTo, sending, setScrollToMessage } = useMessageStore();
  const { activeChatDevices } = useChatStore();
  const { profile } = useProfileStore();

  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // actual File objects
  const [previews, setPreviews] = useState([]); // lightweight preview objects

  /* recording states */
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [recordBars, setRecordBars] = useState(() => new Array(32).fill(0.15));
  const [cancelled, setCancelled] = useState(false);

  /* Fullscreen preview for media only */
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  /* showRecorderUI controls whether the recorder replaces the textarea */
  const [showRecorderUI, setShowRecorderUI] = useState(false);

  const wrapperRef = useRef(null);
  const textareaRef = useRef(null);

  const fileImage = useRef(null);
  const fileVideo = useRef(null);
  const fileDocs = useRef(null);
  const fileAny = useRef(null);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // live recording audio graph
  const recordStreamRef = useRef(null);
  const recordCtxRef = useRef(null);
  const recordAnalyserRef = useRef(null);
  const recordRafRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordStartRef = useRef(null);

  const typingTimeout = useRef(null);

  /* Typing Indicator */
  useEffect(() => {
    if (!chatId || !profile) return;
    const el = textareaRef.current;
    if (!el) return;

    const typing = () => {
      sendTyping(chatId, profile.userId);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(
        () => stopTyping(chatId, profile.userId),
        1200
      );
    };

    el.addEventListener("input", typing);
    return () => {
      el.removeEventListener("input", typing);
      clearTimeout(typingTimeout.current);
    };
  }, [chatId, profile]);

  /* Cleanup previews on unmount */
  useEffect(() => {
    return () => {
      previews.forEach((p) => p?.url && URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  /* Drag & Drop */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const over = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const drop = (e) => {
      e.preventDefault();
      addFiles(Array.from(e.dataTransfer.files || []));
    };

    el.addEventListener("dragover", over);
    el.addEventListener("drop", drop);

    return () => {
      el.removeEventListener("dragover", over);
      el.removeEventListener("drop", drop);
    };
  }, [files]);

  useEffect(() => {
    if (galleryOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
  }, [galleryOpen]);

  /* Add file processor */
  const addFiles = (arr) => {
    let add = [...arr];

    if (add.some((f) => f.size > 20 * 1024 * 1024)) {
      return toast.error("File size limit is 20MB");
    }

    const available = MAX_FILES - files.length;
    if (available <= 0) {
      return toast.error(`Max ${MAX_FILES} files`);
    }

    if (add.length > available) {
      toast.error(`Adding ${available}`);
      add = add.slice(0, available);
    }

    const nf = [...files, ...add];
    setFiles(nf);
    setPreviews((prev) => [...prev, ...add.map(toPreview)]);
  };

  /* file picker */
  const onFilePick = (e) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const removeFile = (i) => {
    const p = previews[i];
    if (p?.url) URL.revokeObjectURL(p.url);

    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  /* ---- Voice recorder with live waveform (WAV conversion) ---- */
  const startRecording = async () => {
    try {
      setShowRecorderUI(true);
      setCancelled(false);
      setRecordBars(new Array(32).fill(0.15));
      setRecordElapsed(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const rec = new MediaRecorder(stream);
      mediaRecorder.current = rec;
      audioChunks.current = [];
      recordStreamRef.current = stream;

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) audioChunks.current.push(ev.data);
      };

      rec.onstop = async () => {
        try {
          const rawBlob = new Blob(audioChunks.current, {
            type: audioChunks.current[0]?.type || "audio/webm",
          });

          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            const ctx = new AC();
            const arrayBuffer = await rawBlob.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const wavBlob = audioBufferToWav(audioBuffer);
            const file = new File([wavBlob], `voice-${Date.now()}.wav`, {
              type: "audio/wav",
            });
            addFiles([file]);
            try {
              ctx.close();
            } catch { }
          } else {
            const file = new File([rawBlob], `voice-${Date.now()}.webm`, {
              type: rawBlob.type || "audio/webm",
            });
            addFiles([file]);
          }
        } catch (err) {
          console.warn("Recording stop/convert failed", err);
          const rawBlob = new Blob(audioChunks.current, {
            type: audioChunks.current[0]?.type || "audio/webm",
          });
          const file = new File([rawBlob], `voice-${Date.now()}.webm`, {
            type: rawBlob.type || "audio/webm",
          });
          addFiles([file]);
        } finally {
          recordStreamRef.current?.getTracks()?.forEach((t) => t.stop());
          stopRecordingVisuals();
          setRecording(false);
          setShowRecorderUI(false);
          setCancelled(false);
          setTimeout(() => textareaRef.current?.focus(), 50);
        }
      };

      // setup live analyser
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        recordCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        recordAnalyserRef.current = analyser;
        src.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);

        const loop = () => {
          if (!recordAnalyserRef.current) return;
          recordAnalyserRef.current.getByteFrequencyData(data);
          const barsCount = 32;
          const chunk = Math.max(1, Math.floor(data.length / barsCount));
          const next = new Array(barsCount).fill(0);
          for (let i = 0; i < barsCount; i++) {
            let sum = 0;
            let count = 0;
            const start = i * chunk;
            const end = Math.min(start + chunk, data.length);
            for (let j = start; j < end; j++) {
              sum += data[j] || 0;
              count++;
            }
            const avg = count ? sum / count : 0;
            next[i] = Math.min(1, (avg / 255) * 1.4);
          }
          setRecordBars(next);
          recordRafRef.current = requestAnimationFrame(loop);
        };
        recordRafRef.current = requestAnimationFrame(loop);
      }

      recordStartRef.current = Date.now();
      recordTimerRef.current = setInterval(() => {
        setRecordElapsed((Date.now() - recordStartRef.current) / 1000);
      }, 500);

      mediaRecorder.current.start();
      setRecording(true);
    } catch (err) {
      toast.error("Recording failed (microphone permission?)");
      stopRecordingVisuals();
      setRecording(false);
      setShowRecorderUI(false);
      setCancelled(false);
    }
  };

  const stopRecordingVisuals = () => {
    if (recordRafRef.current) {
      cancelAnimationFrame(recordRafRef.current);
      recordRafRef.current = null;
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    try {
      recordCtxRef.current?.close();
    } catch { }
    recordCtxRef.current = null;
    recordAnalyserRef.current = null;
    recordStreamRef.current = null;
    setRecordBars(new Array(32).fill(0.15));
    setRecordElapsed(0);
  };

  const stopRecording = () => {
    try {
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      } else {
        stopRecordingVisuals();
        setRecording(false);
        setShowRecorderUI(false);
      }
    } catch (e) {
      stopRecordingVisuals();
      setRecording(false);
      setShowRecorderUI(false);
    }
  };

  /* Emoji add */
  const addEmoji = (emoji) => {
    let char = "";
    if (!emoji) return;
    if (typeof emoji === "string") char = emoji;
    else if (emoji.native) char = emoji.native;
    else if (emoji.emoji) char = emoji.emoji;
    else if (emoji.colons) char = emoji.colons;
    else if (emoji.short_names && emoji.short_names[0])
      char = `:${emoji.short_names[0]}:`;
    else {
      try {
        char = String(emoji);
      } catch {
        char = "";
      }
    }

    setText((t) => t + char);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
        adjustTextareaHeight();
      }
    }, 0);
  };

  const send = async () => {
    const plain = text.trim();
    if (!plain && files.length <= 0) return;
    if (!activeChatDevices?.length) return toast.error("Missing device keys");

    try {
      const { ciphertext, ciphertextNonce, encryptedKeys } =
        encryptOutgoingMessage(plain, activeChatDevices);

      const fd = new FormData();
      fd.append("chatId", chatId);
      fd.append("ciphertext", ciphertext);
      fd.append("ciphertextNonce", ciphertextNonce);
      fd.append("encryptedKeys", JSON.stringify(encryptedKeys));
      fd.append("type", files.length ? "attachment" : "text");

      if (replyTo?._id) fd.append("replyTo", replyTo._id);

      files.forEach((f) => fd.append("attachments", f));

      const ok = await sendMessage(fd, {
        plaintext: plain,
        previews, // ← UI previews you already have
      });
      if (ok) {
        setText("");
        previews.forEach((p) => p?.url && URL.revokeObjectURL(p.url));
        setPreviews([]);
        setFiles([]);
        setReplyTo(null);

        if (textareaRef.current) {
          textareaRef.current.style.height = `${DEFAULT_TEXTAREA_HEIGHT}px`;
          textareaRef.current.blur();
        }
      }
    } catch {
      toast.error("Send failed");
    }
  };

  /* Key handling */
  const keyDown = (e) => {
    if (e.key === "Enter") {
      const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey;
      if (hasModifier) {
        e.preventDefault();
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newVal = el.value.substring(0, start) + "\n" + el.value.substring(end);
        setText(newVal);
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = start + 1;
          adjustTextareaHeight();
        }, 0);
      } else {
        e.preventDefault();
        send();
      }
    }
  };

  /* Auto resize textarea */
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(
      MAX_TEXTAREA_HEIGHT,
      Math.max(DEFAULT_TEXTAREA_HEIGHT, el.scrollHeight)
    );
    el.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [text]);

  /* ---- MEDIA-ONLY ARRAY FOR FULLSCREEN (no docs) ---- */
  const mediaPreviews = previews.filter((p) =>
    p.type?.startsWith("image/") ||
    p.type?.startsWith("video/") ||
    p.type?.startsWith("audio/")
  );

  const mediaIndexMap = new Map(
    mediaPreviews.map((m, idx) => [m.id || m._id || `${m.url}-${idx}`, idx])
  );

  const getPreviewId = (p, idx) => p.id || p._id || `${p.url}-${idx}`;

  // console.log(replyTo);


  return (
    <div ref={wrapperRef} className="border-t bg-card px-4 py-3 flex flex-col gap-3">
      {/* Files preview card (above textarea) */}
      {previews.length > 0 && (
        <div className="w-full bg-muted/40 border rounded-lg p-2 max-h-40 overflow-auto scroll-thumb-only flex flex-wrap gap-2">
          {previews.map((p, i) => {
            const id = getPreviewId(p, i);
            const isImage = p.type?.startsWith("image/");
            const isVideo = p.type?.startsWith("video/");
            const isAudio = p.type?.startsWith("audio/");

            const mediaIdx = mediaIndexMap.get(id);

            const handleTileClick = () => {
              // C: images + videos → fullscreen; audio → inline only; docs → no fullscreen
              if ((isImage || isVideo) && typeof mediaIdx === "number") {
                setGalleryIndex(mediaIdx);
                setGalleryOpen(true);
              }
            };

            return (
              <div
                key={id}
                className="flex items-center gap-2 bg-card px-2 py-1 rounded cursor-pointer"
                onClick={handleTileClick}
              >
                {isImage && p.url && (
                  <img
                    src={p.url}
                    className="w-16 h-12 object-cover rounded"
                    alt={p.filename}
                  />
                )}

                {isVideo && p.url && (
                  <video
                    src={p.url}
                    className="w-16 h-12 object-cover rounded"
                    muted
                  />
                )}

                {isAudio && p.url && (
                  <div
                    className="bg-background border rounded-md px-2 py-1"
                    onClick={(e) => e.stopPropagation()} // keep audio inline, no fullscreen
                  >
                    <SeekableWaveform
                      src={p.url}
                      barCount={48}
                      height={32}
                      showDownload
                    />
                  </div>
                )}

                {!isImage && !isVideo && !isAudio && (
                  <div>
                    {(() => {
                      const badge = badgeFor(p.filename, "file");
                      return badge ? (
                        <span className={`relative w-12 h-8 flex items-center justify-center bg-background rounded text-xs ${badge.className}`}>
                          {badge.label}
                        </span>
                      ) : (
                        p.filename?.split(".").pop() || "file"
                      );
                    })()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="truncate max-w-[220px] text-sm">
                    {p.filename}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {(p.size / 1024).toFixed(1)} KB
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="p-1 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Single fullscreen instance – media only, no docs */}
      {galleryOpen && mediaPreviews.length > 0 && (
        <FullscreenGallery
          items={mediaPreviews}
          index={galleryIndex}
          onClose={() => setGalleryOpen(false)}
          selected={new Set()}
          onToggleSelect={() => { }}
          onDownloadZip={() => { }}
          withinParent={false}
        />
      )}

      {/* Reply preview */}
      {replyTo && (
        <div
          className="flex items-center justify-between px-3 py-2 rounded bg-muted/50 border cursor-pointer hover:bg-muted/60"
          onClick={() => {
            if (replyTo._id) {
              setScrollToMessage(replyTo._id);
            }
          }}
        >
          <div className="text-xs max-w-[70%]">
            <p className="font-medium">
              Replying to {replyTo.sender?.username || "User"}
            </p>

            {buildReplyPreviewText(replyTo)}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setReplyTo(null);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}


      <div className="flex items-start gap-2">
        {/* Attach button pop menu */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-2 rounded hover:bg-muted/40">
              <Paperclip className="w-5 h-5" />
            </button>
          </PopoverTrigger>

          <PopoverContent className="p-2 grid grid-cols-1 gap-1 w-48">
            <button
              className="flex gap-2 items-center px-2 py-1 hover:bg-muted rounded"
              onClick={() => fileImage.current?.click()}
            >
              <ImageIcon className="w-4 h-4" /> Photos
            </button>

            <button
              className="flex gap-2 items-center px-2 py-1 hover:bg-muted rounded"
              onClick={() => fileVideo.current?.click()}
            >
              <VideoIcon className="w-4 h-4" /> Video
            </button>

            <button
              className="flex gap-2 items-center px-2 py-1 hover:bg-muted rounded"
              onClick={() => fileDocs.current?.click()}
            >
              <FileText className="w-4 h-4" /> Documents
            </button>

            <button
              className="flex gap-2 items-center px-2 py-1 hover:bg-muted rounded"
              onClick={() => fileAny.current?.click()}
            >
              <Camera className="w-4 h-4" /> Files
            </button>
          </PopoverContent>
        </Popover>

        {/* Hidden inputs */}
        <input
          ref={fileImage}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFilePick}
        />
        <input
          ref={fileVideo}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={onFilePick}
        />
        <input
          ref={fileDocs}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/*"
          multiple
          className="hidden"
          onChange={onFilePick}
        />
        <input
          ref={fileAny}
          type="file"
          multiple
          className="hidden"
          onChange={onFilePick}
        />

        {/* Mic */}
        <div data-mic-area>
          <button
            type="button"
            className={cn(
              "rounded-full p-2 transition",
              recording ? "bg-destructive text-primary" : "hover:bg-muted/40"
            )}
            onClick={() => (recording ? stopRecording() : startRecording())}
            title={recording ? "Stop recording" : "Record voice"}
          >
            {recording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        {/* TEXTAREA or RECORDER UI */}
        {showRecorderUI ? (
          <div className="flex-1 border rounded-lg px-3 py-2 flex items-center gap-3 bg-background min-h-14">
            <div className="inline-flex items-center gap-2">
              <Mic className="w-4 h-4" />
            </div>

            <RecordingWaveform bars={recordBars} height={36} />

            <div className="flex flex-col items-end min-w-[70px]">
              <span className="tabular-nums text-sm">
                {formatTime(recordElapsed)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {cancelled
                  ? "Release to cancel"
                  : recording
                    ? "Recording..."
                    : "Preparing..."}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={keyDown}
              placeholder="Message..."
              rows={1}
              style={{ height: `${DEFAULT_TEXTAREA_HEIGHT}px` }}
              className="flex-1 min-h-[38px] max-h-40 resize-none rounded-lg border px-3 py-2 text-sm bg-background focus:ring-0 scroll-thumb-only"
              onInput={adjustTextareaHeight}
            />
          </div>
        )}

        {/* Emoji */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-2 rounded hover:bg-muted/40">
              <Smile className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="p-0 w-72 h-[350px]">
            <EmojiPicker onEmojiSelect={addEmoji}>
              <EmojiPickerSearch placeholder="Search emoji..." />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </PopoverContent>
        </Popover>

        {/* Send */}
        <button
          disabled={sending || (!text.trim() && files.length === 0)}
          className="p-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
          onClick={send}
          title="Send message"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}

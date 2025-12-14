"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMessageStore } from "@/store/useMessageStore";
import { useProfileStore } from "@/store/useProfileStore";

import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from "@/components/ui/emoji-picker";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export default function QuickReactions({ message, onClose, parentRef }) {
  const toggleReaction = useMessageStore((s) => s.toggleReaction);
  const { profile } = useProfileStore();
  const myUserId = profile?.userId;

  const rootRef = useRef(null);
  const pickerRef = useRef(null);
  const [openPicker, setOpenPicker] = useState(false);

  /* ----------------------------------------------------------
      Outside click — GUARANTEED CLOSE FIX
  ---------------------------------------------------------- */
  useEffect(() => {
    let active = false;
    const timer = setTimeout(() => (active = true), 150);

    const closeIfOutside = (e) => {
      if (!active) return;

      const target = e.target;
      const insideRoot = rootRef.current?.contains(target);
      const insidePicker = pickerRef.current?.contains(target);
      const insideParent = parentRef?.current?.contains(target);

      if (!insideRoot && !insidePicker && !insideParent) {
        setOpenPicker(false);
        onClose?.();
      }
    };

    document.addEventListener("pointerdown", closeIfOutside, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", closeIfOutside, true);
    };
  }, [onClose, parentRef]);

  /* ----------------------------------------------------------
      Common reactions
  ---------------------------------------------------------- */
  const common = ["❤️", "👍", "😂", "😮", "😢", "😡"];

  const hasMyReaction = (e) =>
    message?.reactions?.some(
      (r) =>
        String(r.userId) === String(myUserId) &&
        (r.reaction === e || r.emoji === e)
    );

  const extractEmoji = (raw) =>
    typeof raw === "string"
      ? raw
      : raw?.emoji || raw?.native || raw?.character || null;

  const handleSelect = (raw) => {
    const emoji = extractEmoji(raw);
    if (!emoji) return;

    toggleReaction(message._id, emoji, myUserId);
    setOpenPicker(false);
    onClose?.();
  };

  /* ----------------------------------------------------------
      UI
  ---------------------------------------------------------- */
  return (
    <div
      ref={rootRef}
      className="
        inline-flex items-center gap-1 
        bg-card border rounded-full 
        px-2 py-1 shadow-md
        animate-in fade-in zoom-in-75 z-50
      "
    >
      {/* Quick reaction buttons */}
      {common.map((emo) => (
        <button
          key={emo}
          className={`text-lg p-1 rounded-md transition ${
            hasMyReaction(emo)
              ? "scale-110 bg-muted/20"
              : "hover:scale-110 hover:bg-muted/20"
          }`}
          onClick={() => handleSelect(emo)}
        >
          {emo}
        </button>
      ))}

      {/* Emoji Picker */}
      <Popover open={openPicker} onOpenChange={setOpenPicker}>
        <PopoverTrigger asChild>
          <button className="p-1 rounded-md hover:bg-muted/30">➕</button>
        </PopoverTrigger>

        <PopoverContent
          ref={pickerRef}
          side="top"
          align="center"
          sideOffset={12}
          className="
            w-fit p-0 
            bg-card border rounded-xl shadow-xl
          "
        >
          <EmojiPicker
            className="h-[330px] w-fit"
            onEmojiSelect={({ emoji }) => handleSelect(emoji)}
          >
            <EmojiPickerSearch className="px-2 pt-2" />
            <EmojiPickerContent className="px-2 scroll-thumb-only" />
            <EmojiPickerFooter className="px-2 pb-2" />
          </EmojiPicker>
        </PopoverContent>
      </Popover>
    </div>
  );
}

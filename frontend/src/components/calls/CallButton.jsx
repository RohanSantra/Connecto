import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import useCallStore from "@/store/useCallStore";
import { Phone, Video, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


export function CallButton({
  chatId,
  isGroup = false,
  members = [],
  disabled = false,
}) {
  const prepareAndStartCall = useCallStore((s) => s.prepareAndStartCall);
  

  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState(null);

  /* ---------------- helpers ---------------- */

  const startCall = async (type) => {
    if (disabled) return;
    try {
      await prepareAndStartCall({ chatId, type });
    } catch (err) {
      console.warn("start call failed", err);
    } finally {
      setOpen(false);
    }
  };

  const startIndividualCall = async (userId, type) => {
    if (disabled) return;
    try {
      await prepareAndStartCall({ chatId, type, targetUserId: userId });
    } catch (err) {
      console.warn("individual call failed", err);
    } finally {
      setOpen(false);
    }
  };

  /* ---------------- dropdown positioning ---------------- */

  const updatePos = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: r.left,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const t = setTimeout(updatePos, 50);
    return () => clearTimeout(t);
  }, [open, updatePos]);

  /* ---------------- outside click / esc ---------------- */

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e) => {
      if (
        anchorRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  /* ---------------- dropdown ---------------- */

  const dropdown =
    open && pos
      ? createPortal(
          <div
            ref={dropdownRef}
            role="menu"
            aria-label="Call options"
            className="fixed z-[100000] w-64 bg-card border rounded-2xl shadow-2xl p-2 pointer-events-auto"
            style={{
              top: Math.min(pos.top, window.innerHeight - 16),
              left: Math.min(pos.left, window.innerWidth - 280),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
              GROUP CALL
            </div>

            {/* Call everyone (audio) */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl
                ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-muted cursor-pointer"
                }`}
              onClick={!disabled ? () => startCall("audio") : undefined}
            >
              <span className="text-sm">Call everyone</span>
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Call everyone (video) */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl
                ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-muted cursor-pointer"
                }`}
              onClick={!disabled ? () => startCall("video") : undefined}
            >
              <span className="text-sm">Video call everyone</span>
              <Video className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="border-t my-2" />

            <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
              CALL INDIVIDUAL
            </div>

            <div className="space-y-1 max-h-56 overflow-auto">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl
                    ${
                      disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      {m.avatarUrl && <AvatarImage src={m.avatarUrl} />}
                      <AvatarFallback>
                        {(m.username || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {m.username || m.userId}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      className={`p-2 rounded ${
                        disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-muted"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startIndividualCall(m.userId, "audio");
                      }}
                    >
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <button
                      type="button"
                      disabled={disabled}
                      className={`p-2 rounded ${
                        disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-muted"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startIndividualCall(m.userId, "video");
                      }}
                    >
                      <Video className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  /* ---------------- render ---------------- */

  return (
    <div ref={anchorRef} className="relative flex items-center gap-1">
      <Button
        size="icon"
        variant="default"
        disabled={disabled}
        onClick={() => startCall("audio")}
        title={disabled ? "Calling disabled" : "Start audio call"}
      >
        <Phone className="w-5 h-5" />
      </Button>

      <Button
        size="icon"
        variant="default"
        disabled={disabled}
        onClick={() => startCall("video")}
        title={disabled ? "Calling disabled" : "Start video call"}
      >
        <Video className="w-5 h-5" />
      </Button>

      {isGroup && (
        <>
          <Button
            size="icon"
            variant="ghost"
            disabled={disabled}
            onClick={() => !disabled && setOpen((v) => !v)}
            title={disabled ? "Calling disabled" : "More call options"}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>

          {dropdown}
        </>
      )}
    </div>
  );
}

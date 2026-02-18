import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import useCallStore from "@/store/useCallStore";
import { Phone, Video, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";

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
  const { isMobile } = useResponsiveDrawer();

  /* ---------------- call helpers ---------------- */

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

  /* ---------------- positioning ---------------- */

  const updatePos = useCallback(() => {
    if (!anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();

    const dropdownWidth = 280;
    const padding = 16;

    let left = rect.left;
    let top = rect.bottom + 8;

    // Prevent overflow right
    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }

    // Prevent overflow left
    if (left < padding) {
      left = padding;
    }

    // Prevent overflow bottom
    const estimatedHeight = 420;
    if (top + estimatedHeight > window.innerHeight - padding) {
      top = rect.top - estimatedHeight - 8;
    }

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const t = setTimeout(updatePos, 50);
    return () => clearTimeout(t);
  }, [open, updatePos]);

  /* ---------------- outside click ---------------- */

  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (
        anchorRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
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
          className={`
              fixed z-[100000]
              bg-card border shadow-2xl
              rounded-2xl
              p-2
              pointer-events-auto
              w-[90vw] sm:w-72
              max-h-[70vh]
              overflow-y-auto
            `}
          style={{
            top: pos.top,
            left: pos.left,
          }}
        >
          {/* Group call section */}
          <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
            GROUP CALL
          </div>

          <DropdownItem
            label="Call everyone"
            icon={<Phone className="w-4 h-4 text-muted-foreground" />}
            disabled={disabled}
            onClick={() => startCall("audio")}
          />

          <DropdownItem
            label="Video call everyone"
            icon={<Video className="w-4 h-4 text-muted-foreground" />}
            disabled={disabled}
            onClick={() => startCall("video")}
          />

          <div className="border-t my-2" />

          {/* Individual calls */}
          <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
            CALL INDIVIDUAL
          </div>

          <div className="space-y-1">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-8 h-8 shrink-0">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} />}
                    <AvatarFallback>
                      {(m.username || "U")[0]}
                    </AvatarFallback>
                  </Avatar>

                  <span className="text-sm font-medium truncate">
                    {m.username || m.userId}
                  </span>
                </div>

                <div className="flex gap-2 shrink-0">
                  <IconButton
                    disabled={disabled}
                    onClick={() => startIndividualCall(m.userId, "audio")}
                    icon={<Phone className="w-4 h-4 text-muted-foreground" />}
                  />

                  <IconButton
                    disabled={disabled}
                    onClick={() => startIndividualCall(m.userId, "video")}
                    icon={<Video className="w-4 h-4 text-muted-foreground" />}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )
      : null;
return (
  <div ref={anchorRef} className="relative flex items-center gap-1">
    {/* Audio button */}
    <Button
      size={isMobile ? "sm" : "icon"}
      variant="default"
      disabled={disabled}
      onClick={() => startCall("audio")}
      className={isMobile && isGroup ? "hidden" : ""}
    >
      <Phone className="w-4 sm:w-5 h-4 sm:h-5" />
    </Button>

    {/* Video button */}
    <Button
      size={isMobile ? "sm" : "icon"}
      variant="default"
      disabled={disabled}
      onClick={() => startCall("video")}
      className={isMobile && isGroup ? "hidden" : ""}
    >
      <Video className="w-4 sm:w-5 h-4 sm:h-5" />
    </Button>

    {/* Group dropdown */}
    {isGroup && (
      <>
        <Button
          size={isMobile ? "sm" : "icon"}
          variant="outline"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className="flex items-center gap-1"
        >
          {isMobile && <span className="text-sm">Calls</span>}
          <ChevronDown className="w-4 h-4" />
        </Button>

        {dropdown}
      </>
    )}
  </div>
);

}

/* ================= small helpers ================= */

function DropdownItem({ label, icon, disabled, onClick }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm
        ${disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-muted cursor-pointer"
        }`}
      onClick={!disabled ? onClick : undefined}
    >
      <span>{label}</span>
      {icon}
    </div>
  );
}

function IconButton({ icon, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`p-2 rounded-lg
        ${disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-muted"
        }`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

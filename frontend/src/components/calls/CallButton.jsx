import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import useCallStore from "@/store/useCallStore";
import { Phone, Video, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useResponsiveDrawer } from "@/hooks/useResponsiveDrawer";
import { motion } from "framer-motion";
import { toast } from "sonner";

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
  const [isCalling, setIsCalling] = useState(false);

  /* ---------------- call helpers ---------------- */

  const startCall = async (type) => {
    if (disabled || isCalling) return;

    const toastId = toast.loading(
      type === "video"
        ? "Starting video call..."
        : "Starting voice call..."
    );

    try {
      setIsCalling(true);

      await prepareAndStartCall({ chatId, type });

      toast.success("Calling...", { id: toastId });

    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        "We couldn’t start the call. Please try again.",
        { id: toastId }
      );
    } finally {
      setIsCalling(false);
      setOpen(false);
    }
  };

  const startIndividualCall = async (userId, type) => {
    if (disabled || isCalling) return;

    const toastId = toast.loading(
      type === "video"
        ? "Starting video call..."
        : "Starting voice call..."
    );

    try {
      setIsCalling(true);

      await prepareAndStartCall({
        chatId,
        type,
        targetUserId: userId,
      });

      toast.success("Calling...", { id: toastId });

    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        "We couldn’t start the call. Please try again.",
        { id: toastId }
      );
    } finally {
      setIsCalling(false);
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
    open
      ? createPortal(
        isMobile ? (
          /* ================= MOBILE BOTTOM SHEET ================= */
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100000] flex items-end bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              ref={dropdownRef}
              onClick={(e) => e.stopPropagation()}
              className="
                w-full
                max-h-[85vh]
                bg-card
                rounded-t-3xl
                border-t
                shadow-2xl
                overflow-hidden
                flex flex-col
              "
            >
              {/* Drag indicator */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 rounded-full bg-muted" />
              </div>

              <div className="px-4 pb-4 overflow-y-auto">
                <MobileCallContent
                  members={members}
                  disabled={disabled || isCalling}
                  startCall={startCall}
                  startIndividualCall={startIndividualCall}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================= DESKTOP POPOVER ================= */
          <div
            ref={dropdownRef}
            role="menu"
            className="
              fixed z-[100000]
              bg-card border shadow-2xl
              rounded-2xl
              p-2
              pointer-events-auto
              w-72
              max-h-[70vh]
              overflow-y-auto
            "
            style={{
              top: pos?.top,
              left: pos?.left,
            }}
          >
            <DesktopCallContent
              members={members}
              disabled={disabled || isCalling}
              startCall={startCall}
              startIndividualCall={startIndividualCall}
              isCalling={isCalling}
            />
          </div>
        ),
        document.body
      )
      : null;

  return (
    <div ref={anchorRef} className="relative flex items-center gap-1">
      {/* Audio button */}
      <Button
        size={isMobile ? "sm" : "icon"}
        variant="default"
        disabled={disabled || isCalling}
        onClick={() => startCall("audio")}
        className={isMobile && isGroup ? "hidden" : ""}
      >
        <Phone className="w-4 sm:w-5 h-4 sm:h-5" />
      </Button>

      {/* Video button */}
      <Button
        size={isMobile ? "sm" : "icon"}
        variant="default"
        disabled={disabled || isCalling}
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
            disabled={disabled || isCalling}
            onClick={() => {
              if (disabled || isCalling) return;
              setOpen((v) => !v);
            }}
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

function IconButton({ icon, onClick, disabled, isCalling }) {
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



function DesktopCallContent({
  members,
  disabled,
  startCall,
  startIndividualCall,
  isCalling
}) {
  return (
    <>
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

      <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
        CALL INDIVIDUAL
      </div>

      <MemberList
        members={members}
        disabled={disabled || isCalling}
        startIndividualCall={startIndividualCall}
        isCalling={isCalling}
      />
    </>
  );
}

function MobileCallContent({
  members,
  disabled,
  startCall,
  startIndividualCall,
  isCalling
}) {
  return (
    <>
      <div className="text-sm font-semibold mb-4">
        Start Call
      </div>

      <div className="space-y-2">
        <Button
          className="w-full"
          disabled={disabled || isCalling}
          onClick={() => startCall("audio")}
        >
          <Phone className="w-4 h-4 mr-2" />
          Call Everyone
        </Button>

        <Button
          variant="outline"
          className="w-full"
          disabled={disabled || isCalling}
          onClick={() => startCall("video")}
        >
          <Video className="w-4 h-4 mr-2" />
          Video Call Everyone
        </Button>
      </div>

      <div className="mt-6 text-xs text-muted-foreground font-medium">
        Call Individual
      </div>

      <MemberList
        members={members}
        disabled={disabled || isCalling}
        startIndividualCall={startIndividualCall}
      />
    </>
  );
}

function MemberList({ members, disabled, startIndividualCall }) {
  return (
    <div className="space-y-2 mt-2">
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
  );
}
// src/components/calls/RejoinCallOverlay.jsx
import React, { useEffect, useRef } from "react";
import useCallStore from "@/store/useCallStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Video, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

export default function RejoinCallOverlay() {
  const activeCall = useCallStore((s) => s.activeCall);
  const rejoinCall = useCallStore((s) => s.rejoinCall);
  const clearActiveCall = useCallStore((s) => s.clearActiveCall);
  const stopLocalMedia = useCallStore((s) => s.stopLocalMedia);
  const loading = useCallStore((s) => s.loading);

  const btnRef = useRef(null);

  useEffect(() => {
    btnRef.current?.focus?.();
  }, []);

  if (!activeCall) return null;

  const meta = activeCall.metadata || {};
  const isVideo = activeCall.type === "video";
  const isGroup = !!meta.groupName;

  console.log(meta);
  

  const title = isGroup ? meta.groupName : meta.callerName || "Call";
  const avatarSrc = isGroup ? meta.groupAvatar : meta.callerAvatar;
  const fallbackLetter = title?.[0]?.toUpperCase() || "C";

  const subtitle = isGroup
    ? "Group call in progress"
    : "Call in progress";

  const handleRejoin = async () => {
    try {
      await rejoinCall();
      toast.success("Rejoining call…");
    } catch (err) {
      toast.error("Could not rejoin. Check camera & microphone permissions.");
    }
  };

  const handleCancel = () => {
    clearActiveCall();
    stopLocalMedia();
    toast("Left call");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="w-16 h-16 ring-2 ring-primary/20">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt={title} />
            ) : (
              <AvatarFallback className="text-xl">
                {fallbackLetter}
              </AvatarFallback>
            )}
          </Avatar>

          <div>
            <div className="text-lg font-semibold leading-tight">
              {title}
            </div>
            <div className="text-sm text-muted-foreground">
              {subtitle}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isVideo ? (
              <>
                <Video className="w-4 h-4" />
                <span>Video call</span>
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                <span>Audio call</span>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground text-center">
          You refreshed the page. Rejoin to restore your microphone
          {isVideo ? " and camera." : "."}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            ref={btnRef}
            onClick={handleRejoin}
            disabled={loading}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Rejoin call
          </Button>

          <Button
            variant="secondary"
            onClick={handleCancel}
            className="px-3"
            aria-label="Leave call"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

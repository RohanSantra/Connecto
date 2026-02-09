import React, { useEffect, useState, useCallback } from "react";
import useCallStore from "@/store/useCallStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PhoneOff, Phone, Video } from "lucide-react";
import { playCallingTone, stopAllCallSounds } from "@/lib/callSoundManager";

export default function OutgoingCallDialog() {
  const activeCall = useCallStore((s) => s.activeCall);
  const endCallApi = useCallStore((s) => s.endCallApi);
  const getProfileById = useProfileStore((s) => s.getProfileById);

  const [elapsedSec, setElapsedSec] = useState(0);

  if (!activeCall || activeCall.status !== "ringing") return null;

  // normalize id
  const callId = activeCall?.callId ?? activeCall?._id;

  const isVideo = activeCall.type === "video";
  const { callerName = "You", callerAvatar, groupName } = activeCall.metadata || {};
  const calleeCount = (activeCall.calleeIds || []).length;
  const callerProfile = getProfileById ? getProfileById(activeCall.callerId) : null;

  useEffect(() => {
    setElapsedSec(0);
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    playCallingTone();
    return () => {
      clearInterval(t);
      stopAllCallSounds();
    };
  }, [callId]);

  const formatted = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  const end = useCallback(async () => {
    try {
      await endCallApi(activeCall._id ?? activeCall.callId);
    } catch (err) {
      console.warn("end call failed", err);
    }
  }, [activeCall, endCallApi]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        end();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [end]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Outgoing call"
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border text-center space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground text-left">
            {groupName ? `Calling group (${calleeCount})` : "Outgoing call"}
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {isVideo ? "Video" : "Voice"} · {formatted}
          </div>
        </div>

        <div className="mx-auto">
          <div className="inline-flex items-center justify-center rounded-full">
            <Avatar className="w-24 h-24">
              {callerAvatar ? <AvatarImage src={callerAvatar} /> : null}
              <AvatarFallback className="text-2xl">{(callerName || "Y")[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div>
          <div className="text-xl font-semibold">
            Calling {groupName || callerName}…
          </div>
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-1">
            {isVideo ? <Video size={16} /> : <Phone size={16} />}
            <span>{isVideo ? "Video call" : "Voice call"}</span>
            {groupName && <span className="mx-2">·</span>}
            {groupName && <span className="text-xs text-muted-foreground">{calleeCount} recipient(s)</span>}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={end}
            className="rounded-full w-14 h-14 bg-destructive"
            aria-label="Cancel call (Esc)"
            title="Cancel call"
          >
            <PhoneOff />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          Press <kbd className="px-2 py-0.5 rounded bg-muted">Esc</kbd> to cancel
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef, useCallback } from "react";
import useCallStore from "@/store/useCallStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, PhoneIncoming, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { playRingtone, stopAllCallSounds } from "@/lib/callSoundManager";

export default function IncomingCallDialog() {
  const incomingCall = useCallStore((s) => s.incomingCall);
  const acceptAndStart = useCallStore((s) => s.acceptAndStart);
  const rejectCallApi = useCallStore((s) => s.rejectCallApi);
  const getProfileById = useProfileStore((s) => s.getProfileById);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const acceptBtnRef = useRef(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // normalize id (backend sometimes uses callId or _id)
  const callId = incomingCall?.callId ?? incomingCall?._id;

  // hide when not ringing
  if (!incomingCall || incomingCall.status !== "ringing") return null;

  const isVideo = incomingCall.type === "video";
  const { callerName = "User", callerAvatar, groupName } = incomingCall.metadata || {};
  const callerProfile = getProfileById ? getProfileById(incomingCall.callerId) : null;

  // timer — reset when callId changes
  useEffect(() => {
    setElapsedSec(0);
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callId]);

  // sound and autofocus — scoped to this incoming call instance
  useEffect(() => {
    if (!callId) return;
    playRingtone();
    acceptBtnRef.current?.focus?.();
    return () => stopAllCallSounds();
  }, [callId]);

  // keyboard shortcuts — register per callId so handler uses latest accept/reject
  useEffect(() => {
    if (!callId) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        reject();
      } else if (e.key === "Enter") {
        e.preventDefault();
        accept({ audio: true, video: isVideo });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, isVideo, incomingCall?.callId]);

  const accept = async ({ audio = true, video = false } = {}) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      await acceptAndStart({
        callId,
        audio,
        video,
      });

    } catch (err) {
      console.warn("accept failed", err);
      toast.error("Failed to accept call");
      setIsProcessing(false);
    }
  };

  const reject = async () => {
    if (isRejecting || isProcessing) return;

    try {
      setIsRejecting(true);
      await rejectCallApi(callId);
    } catch (err) {
      console.warn("reject failed", err);
      toast.error("Failed to reject call");
      setIsRejecting(false);
    }
  };

  const formatted = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border text-center space-y-4">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground text-left">
            {groupName ? <>Group • {groupName}</> : "Incoming call"}
          </div>
          <div className="text-xs text-muted-foreground text-right" aria-live="polite">
            {isVideo ? "Video" : "Voice"} • Ringing · {formatted}
          </div>
        </div>

        {/* avatar */}
        <div className="mx-auto">
          <div className={`inline-flex items-center justify-center rounded-full`}>
            <Avatar className="w-24 h-24">
              {callerAvatar ? <AvatarImage src={callerAvatar} /> : null}
              <AvatarFallback className="text-2xl">{(callerName || "U")[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* name & status */}
        <div>
          <div className="text-xl font-semibold">{callerName}</div>
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-1">
            {isVideo ? <Video size={16} /> : <PhoneIncoming size={16} />}
            <span>{isVideo ? "Incoming video call" : "Incoming voice call"}</span>
            <span className="mx-2">·</span>
          </div>
        </div>

        {/* actions */}
        <div className="flex items-center justify-center gap-6 pt-4">
          {/* Reject */}
          <Button
            onClick={reject}
            disabled={isRejecting || isProcessing}
            className="rounded-full w-14 h-14 bg-destructive flex items-center justify-center"
          >
            {isRejecting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <PhoneOff />
            )}
          </Button>

          {/* Accept audio-only */}
          {!isVideo &&
            <Button
              onClick={() => accept({ audio: true, video: false })}
              disabled={isProcessing}
              className="rounded-full w-14 h-14 bg-emerald-600 flex items-center justify-center"
              aria-label="Answer audio only"
              title="Answer audio only"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Phone />
              )}
            </Button>
          }

          {/* Accept with video */}
          {isVideo && (
            <Button
              onClick={() => accept({ audio: true, video: true })}
              disabled={isProcessing}
              className="rounded-full w-14 h-14 bg-blue-600 flex items-center justify-center"
              aria-label="Answer with video"
              title="Answer with video (Enter)"
              ref={acceptBtnRef}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Video />
              )}
            </Button>
          )}
        </div>

        <div className="hidden sm:block text-xs text-muted-foreground mt-1">
          Press <kbd className="px-2 py-0.5 rounded bg-muted">Enter</kbd> to answer • <kbd className="px-2 py-0.5 rounded bg-muted">Esc</kbd> to reject
        </div>
      </div>
    </div>
  );
}

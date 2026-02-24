"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import useCallStore from "@/store/useCallStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PhoneOff, Phone, Video, Loader2 } from "lucide-react";
import { playCallingTone, stopAllCallSounds } from "@/lib/callSoundManager";

export default function OutgoingCallDialog() {
  const activeCall = useCallStore((s) => s.activeCall);
  const endCallApi = useCallStore((s) => s.endCallApi);

  const myProfile = useProfileStore((s) => s.profile);
  const getProfileById = useProfileStore((s) => s.getProfileById);
  const fetchProfilesByIds = useProfileStore((s) => s.fetchProfilesByIds);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  if (!activeCall || activeCall.status !== "ringing") return null;

  const callId = activeCall?._id ?? activeCall?.callId;
  const isVideo = activeCall.type === "video";

  const isGroup = !!activeCall.metadata?.groupName;
  const groupName = activeCall.metadata?.groupName || null;

  const calleeIds = activeCall.calleeIds || [];

  /* ---------------------------------------------------- */
  /* Resolve target user (1-to-1 only)                   */
  /* ---------------------------------------------------- */

  const targetUserId =
    !isGroup && calleeIds.length === 1 ? calleeIds[0] : null;

  const targetProfile = targetUserId
    ? getProfileById?.(targetUserId)
    : null;

  /* Fetch profile if not already loaded */
  useEffect(() => {
    if (targetUserId && !targetProfile) {
      fetchProfilesByIds?.([targetUserId]);
    }
  }, [targetUserId, targetProfile, fetchProfilesByIds]);

  /* ---------------------------------------------------- */
  /* Display values                                      */
  /* ---------------------------------------------------- */

  const displayName = useMemo(() => {
    if (isGroup) return groupName;
    return targetProfile?.username || "Calling...";
  }, [isGroup, groupName, targetProfile]);

  const displayAvatar = useMemo(() => {
    if (isGroup) return null;
    return targetProfile?.avatarUrl || null;
  }, [isGroup, targetProfile]);

  const calleeCount = calleeIds.length;

  /* ---------------------------------------------------- */
  /* Timer + ringtone                                    */
  /* ---------------------------------------------------- */

  useEffect(() => {
    setElapsedSec(0);
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    playCallingTone();

    return () => {
      clearInterval(t);
      stopAllCallSounds();
    };
  }, [callId]);

  const formatted = `${String(Math.floor(elapsedSec / 60)).padStart(
    2,
    "0"
  )}:${String(elapsedSec % 60).padStart(2, "0")}`;

  /* ---------------------------------------------------- */
  /* Cancel call                                         */
  /* ---------------------------------------------------- */

  const end = useCallback(async () => {
    if (isEnding) return;

    try {
      setIsEnding(true);
      await endCallApi(callId);
    } catch (err) {
      console.warn("end call failed", err);
    }
  }, [callId, endCallApi, isEnding]);

  /* ESC to cancel */
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

  /* ---------------------------------------------------- */
  /* UI                                                  */
  /* ---------------------------------------------------- */

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Outgoing call"
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border text-center space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {isGroup
              ? `Calling group (${calleeCount})`
              : "Outgoing call"}
          </div>
          <div>
            {isVideo ? "Video" : "Voice"} · {formatted}
          </div>
        </div>

        {/* Avatar */}
        <div className="mx-auto">
          <div className={`inline-flex items-center justify-center rounded-full`}>
            <Avatar className="w-24 h-24">
              {displayAvatar && <AvatarImage src={displayAvatar} />}
              <AvatarFallback className="text-2xl">
                {(displayName || "U")[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Name */}
        <div>
          <div className="text-xl font-semibold">
            Calling {displayName}…
          </div>

          <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-2">
            {isVideo ? <Video size={16} /> : <Phone size={16} />}
            <span>{isVideo ? "Video call" : "Voice call"}</span>

            {isGroup && (
              <>
                <span className="mx-2">·</span>
                <span>{calleeCount} recipients</span>
              </>
            )}
          </div>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={end}
            disabled={isEnding}
            className="rounded-full w-14 h-14 bg-destructive"
            aria-label="Cancel call (Esc)"
          >
            {isEnding ? (
              <Loader2 className="animate-spin" />
            ) : (
              <PhoneOff />
            )}
          </Button>
        </div>

        <div className="hidden sm:block text-xs text-muted-foreground">
          Press <kbd className="px-2 py-0.5 rounded bg-muted">Esc</kbd> to cancel
        </div>
      </div>
    </div>
  );
}
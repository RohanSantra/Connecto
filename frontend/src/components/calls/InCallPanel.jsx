"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import useCallStore from "@/store/useCallStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Button } from "@/components/ui/button";
import {
  MicOff,
  Mic,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Phone,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* Unlock browser autoplay */
function unlockAllAudio() {
  document.querySelectorAll("audio").forEach((a) =>
    a.play().catch(() => { })
  );
}

export default function InCallPanel({ callId }) {
  const {
    localStream,
    remoteStreams,
    muted,
    videoEnabled,
    toggleMute,
    toggleVideo,
    endCallApi,
    stopLocalMedia,
    activeCall,
  } = useCallStore();

  const myProfile = useProfileStore((s) => s.profile);
  const fetchProfilesByIds = useProfileStore((s) => s.fetchProfilesByIds);

  const localVideoRef = useRef(null);
  const [seconds, setSeconds] = useState(0);

  const isVideoCall = activeCall?.type === "video";
  const participants = Object.entries(remoteStreams || {});
  const totalUsers = participants.length + 1;

  /* Timer */
  useEffect(() => {
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [activeCall?._id ?? activeCall?.callId]);

  /* Fetch profiles */
  useEffect(() => {
    if (participants.length) {
      fetchProfilesByIds(participants.map(([id]) => id));
    }
  }, [participants.length, fetchProfilesByIds]);

  /* Attach local stream */
  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject =
      isVideoCall && videoEnabled ? localStream : null;
  }, [localStream, videoEnabled, isVideoCall]);

  const time = `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0"
  )}:${String(seconds % 60).padStart(2, "0")}`;

  /* FULLSCREEN GRID LOGIC */
  const gridClass = useMemo(() => {
    if (totalUsers === 1) return "grid-cols-1";
    if (totalUsers === 2) return "grid-cols-1 md:grid-cols-2";
    if (totalUsers <= 4) return "grid-cols-2";
    if (totalUsers <= 6) return "grid-cols-2 md:grid-cols-3";
    if (totalUsers <= 9) return "grid-cols-3";
    return "grid-cols-4";
  }, [totalUsers]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-black text-white">

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Users size={18} />
          <span className="font-semibold text-sm tracking-wide">
            {activeCall?.metadata?.groupName || "In Call"}
          </span>
          <span className="text-xs text-neutral-400">{time}</span>
        </div>

        <span className="text-xs text-neutral-400 flex items-center gap-1">
          {isVideoCall ? <Video size={14} /> : <Phone size={14} />}
          {isVideoCall ? "Video Call" : "Audio Call"}
        </span>
      </div>

      {/* GRID FULLSCREEN */}
      <motion.div
        layout
        className={`flex-1 grid ${gridClass}`}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        <AnimatePresence mode="popLayout">

          {participants.map(([uid, stream]) => (
            <motion.div
              key={uid}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="relative w-full h-full"
            >
              <ParticipantTile userId={uid} stream={stream} />
            </motion.div>
          ))}

          {/* Local Tile */}
          <motion.div
            key="local"
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="relative w-full h-full"
          >
            <div className="relative w-full h-full bg-neutral-900 border border-white/10 overflow-hidden">
              {isVideoCall && videoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <CenteredAvatar
                  name={myProfile?.username || "You"}
                  avatar={myProfile?.avatarUrl}
                />
              )}
              <TileLabel name="You" muted={muted} isSelf />
            </div>
          </motion.div>

        </AnimatePresence>
      </motion.div>

      {/* CONTROLS */}
      <div
        className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6"
        onClick={unlockAllAudio}
      >
        <ControlButton onClick={toggleMute}>
          {muted ? <MicOff /> : <Mic />}
        </ControlButton>

        {isVideoCall && (
          <ControlButton onClick={toggleVideo}>
            {videoEnabled ? <Video /> : <VideoOff />}
          </ControlButton>
        )}

        <Button
          onClick={async () => {
            try {
              await endCallApi(callId);
              stopLocalMedia();
            } catch {
              toast.error("Failed to end call");
            }
          }}
          size="icon"
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 shadow-xl"
        >
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}

/* PARTICIPANT TILE */

function ParticipantTile({ userId, stream }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const getProfileById = useProfileStore((s) => s.getProfileById);
  const profile = getProfileById?.(userId);
  const hasVideo = stream?.getVideoTracks()?.length > 0;

  useEffect(() => {
    if (videoRef.current)
      videoRef.current.srcObject = hasVideo ? stream : null;
  }, [stream, hasVideo]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => { });
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-neutral-900 border border-white/10 overflow-hidden">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <CenteredAvatar
          name={profile?.username || "User"}
          avatar={profile?.avatarUrl}
        />
      )}

      <audio ref={audioRef} autoPlay playsInline />
      <TileLabel name={profile?.username || "User"} />
    </div>
  );
}

/* SHARED COMPONENTS */

function CenteredAvatar({ name, avatar }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 bg-neutral-900">
      <Avatar className="w-20 h-20 border border-white/10">
        {avatar ? (
          <img src={avatar} alt={name} />
        ) : (
          <AvatarFallback className="text-xl">
            {name?.[0]?.toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="text-sm text-neutral-300">{name}</div>
    </div>
  );
}

function TileLabel({ name, muted, isSelf }) {
  return (
    <div className="absolute bottom-3 left-3 px-3 py-1 text-xs bg-black/60 backdrop-blur-md rounded-full flex items-center gap-2">
      <span>{name}</span>
      {muted && <MicOff size={12} />}
      {isSelf && <span className="opacity-60">(You)</span>}
    </div>
  );
}

function ControlButton({ children, onClick }) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="secondary"
      className="h-12 w-12 rounded-full bg-neutral-800 hover:bg-neutral-700 shadow-lg"
    >
      {children}
    </Button>
  );
}
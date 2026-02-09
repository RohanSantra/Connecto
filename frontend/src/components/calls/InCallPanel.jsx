import React, { useEffect, useRef, useState } from "react";
import useCallStore from "@/store/useCallStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Button } from "@/components/ui/button";
import { MicOff, Mic, Video, VideoOff, PhoneOff, Users, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

/* Unlock browser audio autoplay */
function unlockAllAudio() {
  document.querySelectorAll("audio").forEach((a) => a.play().catch(() => { }));
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

  /* Timer — reset when active call changes */
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

  /* Attach local video */
  useEffect(() => {
    if (localVideoRef.current) {
      try {
        localVideoRef.current.srcObject =
          isVideoCall && videoEnabled ? localStream : null;
      } catch (err) {
        // ignore attach errors
      }
    }
  }, [localStream, videoEnabled, isVideoCall]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  /* Dynamic Grid */
  const grid =
    totalUsers === 1
      ? "grid-cols-1"
      : totalUsers === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : totalUsers <= 4
          ? "grid-cols-1 sm:grid-cols-2"
          : totalUsers <= 6
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]";

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-gradient-to-b from-black via-neutral-900 to-black text-white">

      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Users size={18} />
          <span className="font-semibold">
            {activeCall?.metadata?.groupName || "In Call"}
          </span>
          <span className="text-xs text-neutral-400">{time}</span>
        </div>
        <span className="text-xs text-neutral-400 flex items-center gap-1">
          {isVideoCall ? <Video size={14} /> : <Phone size={14} />}
          {isVideoCall ? "Video Call" : "Audio Call"}
        </span>
      </div>

      {/* WAITING OVERLAY */}
      {participants.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
          <Users size={70} className="opacity-20 mb-4" />
          <div className="text-2xl font-semibold">Waiting for others...</div>
          <div className="text-neutral-400 text-sm mt-1">
            Once someone joins, video tiles will appear here
          </div>
        </div>
      )}

      {/* PARTICIPANT GRID */}
      {participants.length > 0 && (
        <div className={`flex-1 grid gap-3 p-3 ${grid}`}>
          {participants.map(([uid, stream]) => (
            <ParticipantTile key={uid} userId={uid} stream={stream} />
          ))}

          {/* LOCAL TILE */}
          <div className="tile">
            {isVideoCall && videoEnabled ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="video" />
            ) : (
              <ProfileCard name={myProfile?.username || "You"} avatar={myProfile?.avatarUrl} />
            )}
            <span className="label">You</span>
          </div>
        </div>
      )}

      {/* CONTROLS */}
      <div
        className="sticky bottom-0 p-4 flex items-center justify-center gap-6 bg-black/70 backdrop-blur-lg border-t border-white/10"
        onClick={unlockAllAudio}
      >
        <Button onClick={toggleMute} size="icon" variant="secondary" className="control">
          {muted ? <MicOff /> : <Mic />}
        </Button>

        {isVideoCall && (
          <Button onClick={toggleVideo} size="icon" variant="secondary" className="control">
            {videoEnabled ? <Video /> : <VideoOff />}
          </Button>
        )}

        <Button
          onClick={async () => {
            try {
              await endCallApi(callId);
              stopLocalMedia();
            } catch (err) {
              console.warn("end call failed", err);
              toast.error("Failed to end call");
            }
          }}
          size="icon"
          className="control bg-red-600 hover:bg-red-700"
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
  const [speaking, setSpeaking] = useState(false);

  const getProfileById = useProfileStore((s) => s.getProfileById);
  const profile = getProfileById?.(userId);

  const hasVideo = !!(stream && stream.getVideoTracks && stream.getVideoTracks().length > 0);

  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = hasVideo ? stream : null;
      } catch (err) {}
    }
  }, [stream, hasVideo]);

  useEffect(() => {
    if (!audioRef.current) return;
    try {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => { });
    } catch (err) {}
  }, [stream]);

  /* Speaking detection */
  useEffect(() => {
    if (!stream) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);
    analyser.fftSize = 512;
    const data = new Uint8Array(analyser.frequencyBinCount);

    let raf;
    const sample = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setSpeaking(avg > 10);
      raf = requestAnimationFrame(sample);
    };
    sample();
    return () => {
      cancelAnimationFrame(raf);
      try { ctx.close(); } catch { }
    };
  }, [stream]);

  return (
    <div className={`tile ${speaking ? "ring" : ""}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline className="video" />
      ) : (
        <ProfileCard name={profile?.username || "User"} avatar={profile?.avatarUrl} />
      )}
      <audio ref={audioRef} autoPlay playsInline />
      <span className="label">{profile?.username || "User"}</span>
    </div>
  );
}

/* PROFILE CARD */
function ProfileCard({ name, avatar }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar className="w-20 h-20">
        {avatar ? <img src={avatar} alt={name} /> : <AvatarFallback>{name[0]}</AvatarFallback>}
      </Avatar>
      <div className="font-medium">{name}</div>
    </div>
  );
}

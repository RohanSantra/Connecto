"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Download } from "lucide-react";

const WF_CACHE_PREFIX = "wf_v1::";

/**
 * SeekableWaveform
 *
 * Props:
 *  src: string (audio URL) - required
 *  barCount?: number (default 60)
 *  height?: number (default 40)
 *  barWidth?: number (default 2)
 *  gap?: number (default 2)
 *  className?: string
 *  showDownload?: boolean
 *  downloadName?: string
 */
export default function SeekableWaveform({
  src,
  barCount = 60,
  height = 40,
  barWidth = 2,
  gap = 2,
  className = "",
  showDownload = false,
  downloadName = "audio",
}) {
  const audioRef = useRef(null);
  const [peaks, setPeaks] = useState(() => new Array(barCount).fill(0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);

  // ───────────────────────── audio element ─────────────────────────
  useEffect(() => {
    if (!src) return;
    const audio = new Audio();
    audio.src = src;
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
    };
    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(1);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [src]);

  // ───────────────────────── waveform peaks (with localStorage cache) ─────────────────────────
  useEffect(() => {
    if (!src) return;

    // skip caching for blob/data URLs
    const canCache =
      typeof window !== "undefined" &&
      !src.startsWith("blob:") &&
      !src.startsWith("data:");

    const key = canCache ? WF_CACHE_PREFIX + src : null;

    const loadCached = () => {
      if (!canCache || !key) return null;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr) || arr.length !== barCount) return null;
        return arr.map((v) => (typeof v === "number" ? v : 0));
      } catch {
        return null;
      }
    };

    const cached = loadCached();
    if (cached) {
      setPeaks(cached);
      return;
    }

    extractPeaks(src, barCount).then((arr) => {
      if (!arr) return;
      setPeaks(arr);
      if (canCache && key) {
        try {
          window.localStorage.setItem(key, JSON.stringify(arr));
        } catch {
          // ignore quota errors
        }
      }
    });
  }, [src, barCount]);

  // ───────────────────────── seek ─────────────────────────
  const seekAtClientX = useCallback(
    (clientX, rect) => {
      if (!audioRef.current || !rect) return;
      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      if (audioRef.current.duration) {
        audioRef.current.currentTime = ratio * audioRef.current.duration;
      }
      setProgress(ratio);
    },
    []
  );

  const handleClickSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekAtClientX(e.clientX, rect);
  };

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekAtClientX(e.clientX, rect);

    const move = (ev) => seekAtClientX(ev.clientX, rect);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // ───────────────────────── playback toggle ─────────────────────────
  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        // autoplay blocked
      }
    }
  };

  // ───────────────────────── style helpers ─────────────────────────
  const formatTime = (sec) => {
    if (!sec || Number.isNaN(sec)) return "0:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const barMinHeight = Math.max(3, Math.round(height * 0.08));

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      style={{ color: "currentColor" }}
    >
      {/* Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md px-2 border border-current/50 bg-background/60"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 translate-x-px" />
        )}
      </button>

      {/* Waveform */}
      <div
        className="flex-1 flex items-center cursor-pointer select-none"
        style={{
          height,
          gap,
        }}
        onClick={handleClickSeek}
        onMouseDown={handleMouseDown}
      >
        {peaks.map((v, i) => {
          const played = i / barCount <= progress;
          const h = Math.max(barMinHeight, Math.round(v * height));
          return (
            <div
              key={i}
              style={{
                width: barWidth,
                height: h,
                borderRadius: 2,
                background: "currentColor",
                opacity: played ? 0.95 : 0.15,
                transition: "height 80ms linear, opacity 120ms linear",
              }}
            />
          );
        })}
      </div>

      {/* Duration */}
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {formatTime(progress * duration || duration)}
      </span>

      {/* Download */}
      {showDownload && (
        <a
          href={src}
          download={downloadName}
          className="inline-flex size-8 items-center justify-center border border-current/50 bg-background/60 rounded-md hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

/* ───────────────────────── peak extraction helper ───────────────────────── */
async function extractPeaks(url, barCount) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const ctx = new AC();
    const audioBuf = await ctx.decodeAudioData(buf);
    const data = audioBuf.getChannelData(0);
    const len = data.length;
    const step = Math.floor(len / barCount) || 1;
    const peaks = new Array(barCount).fill(0);

    for (let i = 0; i < barCount; i++) {
      let start = i * step;
      let end = Math.min(start + step, len);
      let max = 0;
      for (let j = start; j < end; j++) {
        const v = Math.abs(data[j]);
        if (v > max) max = v;
      }
      // sqrt for smoother visual
      peaks[i] = Math.sqrt(max);
    }

    try {
      ctx.close();
    } catch {}
    return peaks;
  } catch {
    return null;
  }
}

"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Calendar, Download, ArrowLeft, ArrowRight } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import { badgeFor } from "@/lib/fileBadge";
import SeekableWaveform from "./SeekableWaveform";
import { detectKind } from "@/lib/detectKind";
import formatSize from "@/lib/formatSize";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";



function useLazyMedia(rootMargin = "300px") {
    const ref = React.useRef(null);
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    obs.disconnect();
                }
            },
            { rootMargin }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return [ref, visible];
}


/* ------------ Kind detection helpers ------------ */
export const isImage = (m) =>
    !!((m?.mimeType || m?.type || "").toString().startsWith("image/"));
export const isVideo = (m) =>
    !!((m?.mimeType || m?.type || "").toString().startsWith("video/"));
export const isAudio = (m) =>
    !!((m?.mimeType || m?.type || "").toString().startsWith("audio/"));

function getMediaSrc(item) {
    return (
        item?.cloudinary?.secure_url ||
        item?.cloudinary?.url ||
        item?.url ||
        item?.secure_url ||
        ""
    );
}

function mediaKey(item) {
    return (
        item?.cloudinary?.public_id ||
        `${item._id}-${getMediaSrc(item)}-${item.filename}`
    );
}

export function groupByDate(items = []) {
    const store = new Map();
    items.forEach((it) => {
        const dt = new Date(it.createdAt || Date.now());
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        let label;
        if (dt.toDateString() === today.toDateString()) label = "Today";
        else if (dt.toDateString() === yesterday.toDateString()) label = "Yesterday";
        else
            label = dt.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });

        const key = `${label}-${dt.toISOString().slice(0, 10)}`;
        if (!store.has(key)) store.set(key, { label, date: dt, items: [] });
        store.get(key).items.push(it);
    });

    return Array.from(store.values())
        .sort((a, b) => b.date - a.date)
        .map((g) => [g.label, g.items]);
}

/* =========================================================
   MAIN GALLERY COMPONENT
========================================================= */
export default function MediaGalleryManager({ items = [], withinParent = false }) {
    const [filter, setFilter] = useState("image");
    const [sortBy, setSortBy] = useState("date");
    const [selected, setSelected] = useState(() => new Set());
    const [fullscreenIndex, setFullscreenIndex] = useState(null);
    const [fullscreenOpen, setFullscreenOpen] = useState(false);


    /* auto switch when empty */
    useEffect(() => {
        const hasImages = items.some((it) => detectKind(it) === "image");
        const hasVideos = items.some((it) => detectKind(it) === "video");
        const hasAudio = items.some((it) => detectKind(it) === "audio");

        if (!hasImages && hasVideos) setFilter("video");
        if (!hasImages && !hasVideos && hasAudio) setFilter("audio");
    }, [items]);

    /* filtering + sorting */
    const filtered = useMemo(() => {
        let out = items.filter((it) => detectKind(it) === filter);

        if (sortBy === "newest") out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (sortBy === "oldest") out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (sortBy === "size") out.sort((a, b) => (b.size || 0) - (a.size || 0));

        return out;
    }, [items, filter, sortBy]);

    const grouped = useMemo(() => {
        if (sortBy !== "date") return null;
        return groupByDate(filtered);
    }, [filtered, sortBy]);


    const toggleSelect = useCallback((item) => {
        const id = mediaKey(item);
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const clearSelection = () => setSelected(new Set());

    const openFullscreenAt = (idx) => {
        setFullscreenIndex(idx);
        setFullscreenOpen(true);
    };

    const closeFullscreen = () => setFullscreenOpen(false);

    /* ZIP generation */
    const downloadSelectedAsZip = useCallback(async () => {
        if (!selected.size) return;

        const ids = [...selected];
        const toDownload = filtered.filter((it) => ids.includes(mediaKey(it)));

        try {
            const zip = new JSZip();
            for (let it of toDownload) {
                const resp = await fetch(getMediaSrc(it));
                const blob = await resp.blob();
                zip.file(it.filename || `${Date.now()}`, blob);
            }
            const data = await zip.generateAsync({ type: "blob" });
            saveAs(data, `media-${Date.now()}.zip`);
        } catch (e) {
            console.warn("zip failed", e);
        }
    }, [filtered, selected]);

    return (
        <div className="flex h-full flex-col">
            {/* Controls */}
            <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    <FilterPills filter={filter} onChange={setFilter} />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Sort</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-8 w-[120px] text-xs">
                                    <SelectValue placeholder="Sort" />
                                </SelectTrigger>

                                <SelectContent className="z-[9999]" position="popper">
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="oldest">Oldest</SelectItem>
                                    <SelectItem value="size">Size (desc)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{selected.size} selected</span>
                    <button
                        onClick={clearSelection}
                        className="rounded-full bg-muted/70 px-3 py-1 hover:bg-muted"
                    >
                        Clear
                    </button>
                    <button
                        onClick={downloadSelectedAsZip}
                        disabled={!selected.size}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full px-3 py-1",
                            !selected.size
                                ? "bg-muted text-muted-foreground cursor-default"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                    >
                        <Download className="w-3 h-3" /> ZIP
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-1 scroll-thumb-only">
                {filtered.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No media found
                    </div>
                ) : sortBy === "date" ? (
                    grouped.map(([label, arr]) => (
                        <section key={label} className="mb-5">
                            <div className="mb-2 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {label}
                                </span>
                                <span className="text-[11px] text-muted-foreground/80">
                                    {arr.length} item{arr.length > 1 ? "s" : ""}
                                </span>
                            </div>

                            {filter === "audio" ? (
                                <div className="flex flex-col gap-2">
                                    {arr.map((it) => (
                                        <AudioRow
                                            key={mediaKey(it)}
                                            item={it}
                                            selected={selected.has(mediaKey(it))}
                                            onToggle={() => toggleSelect(it)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {arr.map((it) => {
                                        const idx = filtered.findIndex((x) => mediaKey(x) === mediaKey(it));
                                        return (
                                            <ThumbCard
                                                key={mediaKey(it)}
                                                item={it}
                                                selected={selected.has(mediaKey(it))}
                                                onToggle={() => toggleSelect(it)}
                                                onOpen={() => openFullscreenAt(idx)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ))
                ) : filter === "audio" ? (
                    <div className="flex flex-col gap-2">
                        {filtered.map((it) => (
                            <AudioRow
                                key={mediaKey(it)}
                                item={it}
                                selected={selected.has(mediaKey(it))}
                                onToggle={() => toggleSelect(it)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {filtered.map((it, idx) => (
                            <ThumbCard
                                key={mediaKey(it)}
                                item={it}
                                selected={selected.has(mediaKey(it))}
                                onToggle={() => toggleSelect(it)}
                                onOpen={() => openFullscreenAt(idx)}
                            />
                        ))}
                    </div>
                )}
            </div>


            {/* Fullscreen Viewer */}
            {fullscreenOpen && (
                <FullscreenGallery
                    items={filtered}
                    index={fullscreenIndex}
                    onClose={closeFullscreen}
                    selected={selected}
                    onToggleSelect={toggleSelect}
                    onDownloadZip={downloadSelectedAsZip}
                    withinParent={withinParent}
                />
            )}
        </div>
    );
}

/* ------------ Filter pills ------------ */
function FilterPills({ filter, onChange }) {
    const pills = [
        { id: "image", label: "Images" },
        { id: "video", label: "Videos" },
        { id: "audio", label: "Audio" },
    ];

    return (
        <div className="inline-flex overflow-hidden rounded-full bg-muted/60 p-1 text-xs">
            {pills.map((p) => (
                <button
                    key={p.id}
                    onClick={() => onChange(p.id)}
                    className={cn(
                        "px-3 py-1 rounded-full transition",
                        filter === p.id ? "bg-background shadow-sm" : "text-muted-foreground"
                    )}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}

/* ------------ Thumbnail Card (images/videos) ------------ */
function ThumbCard({ item, selected, onToggle, onOpen }) {
    const kind = detectKind(item);
    const src = getMediaSrc(item);
    const badge = badgeFor(item.filename, kind);
    const [mediaRef, show] = useLazyMedia();
    const [loaded, setLoaded] = useState(false);

    return (
        <div ref={mediaRef} className="group relative">
            <button
                type="button"
                onClick={onOpen}
                className="block w-full overflow-hidden rounded-xl bg-muted/60 shadow-sm"
            >
                <div className="relative aspect-3/4 w-full">
                    {/* skeleton */}
                    <div
                        className={cn(
                            "absolute inset-0 bg-muted animate-pulse",
                            loaded && "opacity-0"
                        )}
                    />

                    {show && kind === "image" && (
                        <img
                            src={src}
                            alt={item.filename}
                            loading="lazy"
                            className={cn(
                                "absolute inset-0 w-full h-full object-cover transition duration-300",
                                loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
                            )}
                            onLoad={() => setLoaded(true)}
                        />
                    )}

                    {show && kind === "video" && (
                        <video
                            src={src}
                            muted
                            playsInline
                            preload="metadata"
                            className={cn(
                                "absolute inset-0 w-full h-full object-cover transition",
                                loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
                            )}
                            onLoadedData={() => setLoaded(true)}
                        />
                    )}
                </div>
            </button>

            {/* select toggle */}
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    "absolute left-2 top-2 w-7 h-7 inline-flex items-center justify-center rounded-full border text-xs font-semibold shadow backdrop-blur",
                    selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card/80 text-foreground border-border"
                )}
            >
                {selected ? "✓" : "+"}
            </button>

            <div className="mt-1 flex justify-between text-[11px]">
                <span className="truncate max-w-32">{item.filename}</span>
                {badge && <span className={badge.className}>{badge.label}</span>}
            </div>
        </div>
    );
}


/* ------------ Audio list row ------------ */
function AudioRow({ item, selected, onToggle }) {
    const src = getMediaSrc(item);

    function getResponsiveBarCount() {
        const w = typeof window !== "undefined" ? window.innerWidth : 360;

        if (w < 400) return 40;      // small phones
        if (w < 768) return 80;      // tablets / mid
        if (w < 1280) return 120;    // laptops
        return 200;                  // full screens
    }


    return (
        <div
            className="relative rounded-xl bg-card border shadow px-4 py-3 flex flex-col cursor-pointer hover:bg-muted/40 transition"
        >
            {/* toggle */}
            <button
                type="button"
                className={cn(
                    "absolute left-2 top-2 w-7 h-7 inline-flex items-center justify-center rounded-full border text-xs font-semibold shadow backdrop-blur",
                    selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card/80 text-foreground border-border"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
            >
                {selected ? "✓" : "+"}
            </button>

            {/* waveform */}
            <div
                className="mt-1 text-primary"
                onClick={(e) => e.stopPropagation()}
            >
                <SeekableWaveform
                    src={src}
                    barCount={getResponsiveBarCount()}
                    height={46}
                />
            </div>

            <div className="mt-2 text-xs text-muted-foreground truncate">
                {item.filename} • {formatSize(item.size)}
            </div>
        </div>
    );
}




/* =========================================================
   FullscreenGallery (supports image/video/audio only)
========================================================= */

export function FullscreenGallery({ items = [], index = 0, onClose, selected = new Set(), onToggleSelect = () => { }, onDownloadZip = () => { }, withinParent = false }) {
    const [i, setI] = useState(index);
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const scrubRef = useRef(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);
    const [scrubbing, setScrubbing] = useState(false);

    useEffect(() => setI(index), [index]);

    const cur = items[i];
    if (!cur) return null;

    const src = getMediaSrc(cur);
    const kind = detectKind(cur);
    const badge = badgeFor(cur.filename, kind);

    const goPrev = () => i > 0 && setI(i - 1);
    const goNext = () => i < items.length - 1 && setI(i + 1);

    useEffect(() => {
        const stop = (e) => e.preventDefault();
        document.addEventListener("touchmove", stop, { passive: false });
        document.addEventListener("gesturestart", stop);
        document.addEventListener("gesturechange", stop);
        document.addEventListener("gestureend", stop);
        return () => {
            document.removeEventListener("touchmove", stop);
            document.removeEventListener("gesturestart", stop);
            document.removeEventListener("gesturechange", stop);
            document.removeEventListener("gestureend", stop);
        };
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [i, items.length, onClose]);

    const onBgClick = (e) => e.target === containerRef.current && onClose();

    const downloadCurrent = () => {
        const a = document.createElement("a");
        a.href = src;
        a.download = cur.filename || "file";
        a.click();
    };

    const isSelected = selected && selected.has && selected.has(mediaKey(cur));
    const formatTime = (sec) => {
        if (!sec || Number.isNaN(sec)) return "0:00";
        const s = Math.floor(sec);
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, "0")}`;
    };

    const onVideoLoaded = () => {
        if (videoRef.current) setVideoDuration(videoRef.current.duration || 0);
    };
    const onVideoTimeUpdate = () => {
        if (!videoRef.current || scrubbing || !videoDuration) return;
        const ratio = videoRef.current.currentTime / videoDuration;
        setVideoProgress(ratio || 0);
    };

    const getClientX = (e) => ("touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX ?? 0);
    const startScrub = (e) => { e.stopPropagation(); setScrubbing(true); doScrub(e); };
    const doScrub = (e) => {
        if (!scrubRef.current || !videoRef.current || !videoDuration) return;
        const rect = scrubRef.current.getBoundingClientRect();
        const x = getClientX(e);
        let ratio = (x - rect.left) / rect.width;
        ratio = Math.min(1, Math.max(0, ratio));
        setVideoProgress(ratio);
        videoRef.current.currentTime = videoDuration * ratio;
    };
    const endScrub = (e) => { if (scrubbing) e?.stopPropagation?.(); setScrubbing(false); };

    const outerClass = withinParent ? "absolute inset-0" : "fixed inset-0";

    return (
        <div ref={containerRef} className={cn(outerClass, "z-50 flex items-center justify-center bg-background/90 fullscreen-container")} onClick={onBgClick}>
            <div className="relative flex h-full w-full max-w-5xl flex-col px-3 py-4 sm:px-4">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-full bg-background/40 px-3 py-1 text-[11px] text-primary"><ArrowLeft className="w-3 h-3" /> Back</button>
                        <span className="hidden sm:inline">{i + 1} / {items.length}</span>
                        {badge && <span className={badge.className}>{badge.label}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        <button type="button" onClick={downloadCurrent} className="inline-flex items-center gap-1 rounded-full bg-background/40 px-3 py-1 text-[11px] text-primary"><Download className="w-3 h-3" /> Save</button>
                        <button type="button" onClick={() => onToggleSelect(cur)} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px]", isSelected ? "bg-primary text-primary-foreground" : "bg-background/40 text-primary")}>{isSelected ? "Selected" : "Select"}</button>
                    </div>
                </div>

                <div className="relative flex-1 overflow-hidden rounded-2xl bg-background/70 border border-foreground/10">
                    <button type="button" onClick={(e) => { e.stopPropagation(); goPrev(); }} disabled={i === 0} className={cn("absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/40 text-primary backdrop-blur", i === 0 && "opacity-30 cursor-default")}><ArrowLeft className="w-4 h-4" /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); goNext(); }} disabled={i === items.length - 1} className={cn("absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/40 text-primary backdrop-blur", i === items.length - 1 && "opacity-30 cursor-default")}><ArrowRight className="w-4 h-4" /></button>

                    <div className="flex h-full w-full items-center justify-center">
                        {kind === "image" && <img src={src} alt={cur.filename} className="max-h-[90vh] max-w-full select-none" draggable={false} />}
                        {kind === "video" && (
                            <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col items-center justify-center gap-3 px-3">
                                <video ref={videoRef} src={src} className="max-h-[70vh] w-full rounded-xl bg-background" controls onLoadedMetadata={onVideoLoaded} onTimeUpdate={onVideoTimeUpdate} />
                                {videoDuration > 0 && (
                                    <div className="w-full text-[11px] text-muted-foreground">
                                        <div ref={scrubRef} className="relative h-2 w-full cursor-pointer rounded-full bg-white/10" onMouseDown={startScrub} onMouseMove={(e) => scrubbing && doScrub(e)} onMouseUp={endScrub} onMouseLeave={endScrub} onTouchStart={startScrub} onTouchMove={doScrub} onTouchEnd={endScrub}>
                                            <div className="absolute left-0 top-0 h-2 rounded-full bg-primary" style={{ width: `${videoProgress * 100}%` }} />
                                            <div className="absolute -top-1 h-4 w-4 rounded-full bg-primary shadow-sm" style={{ left: `calc(${videoProgress * 100}% - 8px)` }} />
                                        </div>
                                        <div className="mt-1 flex justify-between"><span>{formatTime(videoDuration * videoProgress)}</span><span>{formatTime(videoDuration)}</span></div>
                                    </div>
                                )}
                            </div>
                        )}
                        {kind === "audio" && (
                            <div className="w-full max-w-xl rounded-xl bg-background/60 p-4 text-xs text-muted-foreground">
                                <div className="mb-2 truncate text-sm text-primary">
                                    {cur.filename}
                                </div>

                                <div className="text-primary mb-2">
                                    <SeekableWaveform
                                        src={src}
                                        barCount={120}
                                        height={50}
                                        showDownload={true}
                                        downloadName={cur.filename || "audio"}
                                        className="w-full"
                                    />
                                </div>

                                <div className="mt-1 text-[11px]">
                                    {formatSize(cur.size)} •{" "}
                                    {cur.createdAt ? new Date(cur.createdAt).toLocaleString() : ""}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <div className="truncate"><span className="font-medium text-foreground">{cur.filename}</span><span className="ml-2 text-muted-foreground/80">{formatSize(cur.size)} • {cur.createdAt ? new Date(cur.createdAt).toLocaleString() : ""}</span></div>
                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                        <div><span className="text-muted-foreground">{selected?.size ?? 0} selected</span></div>
                        <button type="button" onClick={onDownloadZip} disabled={!selected || selected.size === 0} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1", !selected || selected.size === 0 ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                            <Download className="w-3 h-3" /> ZIP
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, X, Calendar, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useMessageStore } from "@/store/useMessageStore";
import { badgeFor } from "@/lib/fileBadge";
import MediaGalleryManager, {
    isImage,
    isVideo,
    isAudio,
    groupByDate,
} from "./MediaGalleryManager";
import FileViewer from "./FileViewer";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import MediaGallerySkeleton from "../Skeleton/MediaGallerySkeleton";


function formatSize(size) {
    if (!size) return "";
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaDocsOverlay({ chatId }) {
    const { closeMediaDocs } = useUIStore();
    const { fetchMedia, fetchDocuments } = useMessageStore();

    const [activeTab, setActiveTab] = useState("media");
    const [loading, setLoading] = useState(true);
    const [media, setMedia] = useState([]);
    const [docs, setDocs] = useState([]);
    const [viewerFile, setViewerFile] = useState(null);

    // 🔥 NEW — sort state
    const [sortBy, setSortBy] = useState("date");

    useEffect(() => {
        if (!chatId) return;
        loadData();
    }, [chatId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const m = await fetchMedia(chatId);
            const d = await fetchDocuments(chatId);
            setMedia(Array.isArray(m) ? m : []);
            setDocs(Array.isArray(d) ? d : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const mediaItems = useMemo(
        () => (media || []).filter((it) => isImage(it) || isVideo(it) || isAudio(it)),
        [media]
    );

    // 🔥 Sorted docs
    const sortedDocs = useMemo(() => {
        const out = [...docs];

        if (sortBy === "newest") out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (sortBy === "oldest") out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (sortBy === "size") out.sort((a, b) => (b.size || 0) - (a.size || 0));

        return out;
    }, [docs, sortBy]);

    // 🔥 Group only if date sort
    const groupedDocs = useMemo(() => {
        if (sortBy !== "date") return null;
        return groupByDate(sortedDocs);
    }, [sortedDocs, sortBy]);

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-998" onClick={closeMediaDocs} />
            <div className="fixed inset-0 z-999 flex items-center justify-center px-2 sm:px-4 py-4">
                <div className="relative flex h-full w-full max-w-5xl flex-col rounded-2xl bg-card shadow-xl border overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <div className="grid grid-col-1 sm:flex items-center gap-3 w-full">
                            <div className="inline-flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1 text-xs font-medium">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>Shared in this chat</span>
                            </div>

                            <div className="flex rounded-full bg-muted/60 p-1 text-xs">
                                <button
                                    onClick={() => setActiveTab("media")}
                                    className={cn("px-3 py-1 rounded-full transition w-full",
                                        activeTab === "media" ? "bg-background shadow-sm" : "text-muted-foreground")}
                                >
                                    Media
                                </button>
                                <button
                                    onClick={() => setActiveTab("docs")}
                                    className={cn("px-3 py-1 rounded-full transition w-full",
                                        activeTab === "docs" ? "bg-background shadow-sm" : "text-muted-foreground")}
                                >
                                    Documents
                                </button>
                            </div>

                            {/* 🔥 Sort dropdown for documents */}
                            {activeTab === "docs" && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Sort</span>

                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="h-8 w-[120px] text-xs">
                                            <SelectValue placeholder="Sort" />
                                        </SelectTrigger>

                                        <SelectContent position="popper" className="z-[9999]">
                                            <SelectItem value="date">Date</SelectItem>
                                            <SelectItem value="newest">Newest</SelectItem>
                                            <SelectItem value="oldest">Oldest</SelectItem>
                                            <SelectItem value="size">Size (desc)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={loadData} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={closeMediaDocs} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-hidden">
                        {loading ? (
                            <div className="h-full w-full overflow-hidden px-3 pb-3 pt-2">
                                <MediaGallerySkeleton activeTab={activeTab} />
                            </div>
                        ) : activeTab === "media" ? (
                            <div className="h-full overflow-hidden px-3 pb-3 pt-2">
                                <MediaGalleryManager items={mediaItems} withinParent />
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto px-3 pb-3 pt-2 scroll-thumb-only">
                                {sortedDocs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-sm text-muted-foreground h-full">
                                        <FileText className="w-8 h-8 mb-2" />
                                        <p>No documents shared yet</p>
                                    </div>
                                ) : sortBy === "date" ? (
                                    groupedDocs.map(([label, arr]) => (
                                        <section key={label} className="mb-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
                                                <span className="text-[11px] text-muted-foreground/80">
                                                    {arr.length} item{arr.length > 1 ? "s" : ""}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {arr.map((doc, i) => (
                                                    <DocRow key={i} item={doc} onView={setViewerFile} />
                                                ))}
                                            </div>
                                        </section>
                                    ))
                                ) : (
                                    <div className="space-y-2">
                                        {sortedDocs.map((doc) => (
                                            <DocRow key={doc._id} item={doc} onView={setViewerFile} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {viewerFile && <FileViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
            </div>
        </>
    );
}

function DocRow({ item, onView }) {
    const badge = badgeFor(item.filename, "file");
    const url =
        item?.cloudinary?.secure_url ||
        item?.cloudinary?.url ||
        item?.url ||
        "";

    return (
        <div
            className="flex items-start gap-3 rounded-xl border bg-muted/50 hover:bg-muted/70 px-3 py-2 transition cursor-pointer w-full"
            onClick={() => onView(item)}
        >
            {/* Icon */}
            <div className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-background shadow-sm border">
                <FileText className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium max-w-full">
                        {item.filename}
                    </p>

                    {badge && (
                        <span className={`${badge.className} shrink-0 text-[10px] px-1.5 py-0.5 rounded-md`}>
                            {badge.label}
                        </span>
                    )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {formatSize(item.size)}
                </p>
            </div>

            {/* Actions */}
            <div className="
        flex flex-col sm:flex-row
        gap-1
        shrink-0
      ">
                {/* Download */}
                <a
                    href={url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="
            inline-flex items-center justify-center
            rounded-md border
            bg-background
            px-2 py-1
            text-[10px] sm:text-[11px]
            hover:bg-muted/60
            whitespace-nowrap
          "
                >
                    Download
                </a>

                {/* Preview */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onView(item);
                    }}
                    className="
            inline-flex items-center justify-center
            rounded-md border
            bg-background
            px-2 py-1
            text-[10px] sm:text-[11px]
            hover:bg-muted/60
            whitespace-nowrap
          "
                >
                    Preview
                </button>
            </div>
        </div>
    );
}



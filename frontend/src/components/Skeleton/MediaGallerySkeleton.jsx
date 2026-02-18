"use client";

import React from "react";
import { Calendar, Download, FileText } from "lucide-react";

/* ---------- Shared Header Controls Skeleton ---------- */

function HeaderSkeleton() {
    return (
        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 items-center">
                <div className="inline-flex overflow-hidden rounded-full bg-muted/60 p-1 text-xs">
                    <div className="h-7 w-16 sm:w-20 rounded-full bg-background shadow-sm mr-2" />
                    <div className="h-7 w-16 sm:w-20 rounded-full bg-muted mr-2" />
                    <div className="h-7 w-16 sm:w-20 rounded-full bg-muted" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-4 w-8 bg-muted rounded" />
                    <div className="h-8 w-[100px] sm:w-[120px] bg-muted rounded-md" />
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
                <div className="h-4 w-14 bg-muted rounded" />
                <div className="h-8 w-16 sm:w-20 bg-muted rounded-full" />
                <div className="h-8 w-16 bg-muted rounded-full flex items-center justify-center gap-1">
                    <Download className="w-3 h-3 text-muted-foreground/40" />
                </div>
            </div>
        </div>
    );
}

/* ---------- Date Header Skeleton ---------- */

function DateHeaderSkeleton() {
    return (
        <div className="mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground/40" />
            <div className="h-4 w-24 sm:w-28 bg-muted rounded" />
            <div className="h-3 w-10 bg-muted rounded ml-2" />
        </div>
    );
}

/* =====================================================
   MEDIA SKELETON (Images / Videos)
===================================================== */

function MediaThumbSkeleton() {
    return (
        <div className="relative animate-pulse">
            <div className="block w-full overflow-hidden rounded-xl bg-muted/60 shadow-sm border">
                <div className="aspect-[3/4] w-full" />
            </div>
            <div className="absolute left-2 top-2 h-7 w-7 rounded-full bg-muted/80 border" />
            <div className="mt-2 flex justify-between text-[11px] gap-2">
                <div className="h-3 w-2/3 bg-muted rounded" />
                <div className="h-5 w-10 bg-muted/70 rounded-md" />
            </div>
        </div>
    );
}

function MediaSkeletonBody() {
    return (
        <>

            {Array.from({ length: 4 }).map((_, i) => (
                <section className="mb-5" key={i}>
                    <DateHeaderSkeleton />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <MediaThumbSkeleton key={i} />
                        ))}
                    </div>
                </section>
            ))}



        </>
    );
}

/* =====================================================
   FILES / DOCUMENTS SKELETON
===================================================== */

function FileRowSkeleton() {
    return (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-2.5 animate-pulse">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background border">
                <FileText className="w-4 h-4 text-muted-foreground/40" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
                <div className="h-3 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/3 bg-muted rounded" />
            </div>

            <div className="flex gap-2">
                <div className="h-7 w-16 rounded-full bg-muted" />
                <div className="h-7 w-16 rounded-full bg-muted" />
            </div>
        </div>
    );
}

function FileSkeletonBody() {
    return (
        <>

            {Array.from({ length: 5 }).map((_, i) => (
                <section className="mb-5" key={i}>
                    <DateHeaderSkeleton />
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <FileRowSkeleton key={i} />
                        ))}
                    </div>
                </section>
            ))}



        </>
    );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function MediaGallerySkeleton({ activeTab }) {
    return (
        <div className="flex h-full w-full flex-col" aria-hidden>
            {activeTab === "media" && <HeaderSkeleton />}

            <div className="flex-1 overflow-y-auto pr-1 scroll-thumb-only">
                {activeTab === "media" ? <MediaSkeletonBody /> : <FileSkeletonBody />}
            </div>
        </div>
    );
}

"use client";

export default function DevicesSectionSkeleton({
    count = 3,
}) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-xl border bg-card overflow-hidden"
                >
                    {/* HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">

                        {/* Icon */}
                        <div className="w-11 h-11 rounded-lg bg-muted shrink-0" />

                        {/* Main Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="h-4 w-16 bg-muted rounded" />
                                <div className="h-4 w-20 bg-muted rounded" />
                            </div>

                            <div className="h-3 w-40 bg-muted rounded" />
                        </div>

                        {/* Right side */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
                            <div className="h-5 w-16 bg-muted rounded-full" />
                            <div className="h-5 w-5 bg-muted rounded" />
                        </div>
                    </div>

                    {/* EXPANDED SKELETON PREVIEW (optional visual balance) */}
                    {/* <div className="border-t px-4 py-3 bg-background/40 space-y-4">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <div className="h-3 w-20 bg-muted rounded" />
                                    <div className="h-3 w-32 bg-muted rounded" />
                                </div>

                                <div className="space-y-1">
                                    <div className="h-3 w-20 bg-muted rounded" />
                                    <div className="h-3 w-32 bg-muted rounded" />
                                </div>
                            </div>

                            <div className="h-3 w-64 max-w-full bg-muted rounded" />

                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                                <div className="h-8 w-32 bg-muted rounded" />
                                <div className="h-8 w-28 bg-muted rounded sm:ml-auto" />
                            </div>

                        </div> */}
                </div>
            ))}
        </div>
    );
}

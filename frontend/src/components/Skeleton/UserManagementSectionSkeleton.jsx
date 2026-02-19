"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function UserManagementSectionSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">

            {/* ================= SEARCH + FILTERS ================= */}
            <div className="flex flex-col gap-3">

                {/* Search Bar */}
                <div className="bg-card rounded-md p-3 flex items-center gap-3 shadow-sm">
                    <div className="h-4 w-4 bg-muted rounded shrink-0" />
                    <div className="h-4 flex-1 bg-muted rounded" />
                    <div className="h-8 w-16 bg-muted rounded shrink-0" />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-8 w-24 sm:w-28 md:w-32 bg-muted rounded"
                        />
                    ))}
                </div>
            </div>

            {/* ================= KPI ROW ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-5 space-y-3">
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-8 w-16 sm:w-20 bg-muted rounded" />
                            <div className="h-3 w-32 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ================= USER LIST ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="h-3 w-3/4 max-w-xs bg-muted rounded" />
                </CardHeader>

                <CardContent className="space-y-4">

                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border"
                        >
                            {/* LEFT SECTION */}
                            <div className="flex items-start gap-3 min-w-0 w-full">
                                <div className="h-4 w-6 bg-muted rounded shrink-0" />

                                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted shrink-0" />

                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="h-4 w-1/2 sm:w-1/3 bg-muted rounded" />
                                    <div className="h-3 w-3/4 bg-muted rounded" />
                                    <div className="h-3 w-1/3 bg-muted rounded lg:hidden" />
                                </div>
                            </div>

                            {/* RIGHT SECTION */}
                            <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
                                <div className="h-4 w-16 sm:w-20 bg-muted rounded shrink-0" />

                                <div className="hidden lg:block h-4 w-32 bg-muted rounded shrink-0" />

                                <div className="h-8 w-8 bg-muted rounded shrink-0" />
                            </div>
                        </div>
                    ))}

                    {/* ================= PAGINATION ================= */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="flex gap-2">
                            <div className="h-8 w-14 sm:w-16 bg-muted rounded" />
                            <div className="h-8 w-14 sm:w-16 bg-muted rounded" />
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}

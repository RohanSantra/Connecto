"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function ActivitySectionSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">

            {/* ================= KPI CARDS ================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 bg-muted rounded shrink-0" />
                                <div className="h-4 w-24 bg-muted rounded" />
                            </div>

                            <div className="h-8 sm:h-9 w-28 sm:w-32 bg-muted rounded" />

                            <div className="h-3 w-40 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ================= AREA CHART CARD ================= */}
            <Card>
                <CardHeader className="space-y-3">

                    {/* Title */}
                    <div className="h-5 w-40 bg-muted rounded" />

                    {/* Description */}
                    <div className="h-3 w-3/4 max-w-xs bg-muted rounded" />

                    {/* Date Badge */}
                    <div className="h-6 w-44 bg-muted rounded" />
                </CardHeader>

                <CardContent>

                    {/* Chart Placeholder */}
                    <div className="w-full h-[220px] sm:h-[260px] md:h-[300px] bg-muted rounded-md" />

                </CardContent>
            </Card>

        </div>
    );
}

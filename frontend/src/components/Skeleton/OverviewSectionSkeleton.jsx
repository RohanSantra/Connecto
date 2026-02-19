"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function OverviewSectionSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">

            {/* ================= HEADER ================= */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-muted rounded-md" />
                    <div className="h-4 w-72 bg-muted rounded-md" />
                </div>

                <div className="h-6 w-40 bg-muted rounded-full" />
            </div>

            {/* ================= KPI GRID ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-6 space-y-3">
                            <div className="h-4 w-32 bg-muted rounded-md" />
                            <div className="h-8 w-24 bg-muted rounded-md" />
                            <div className="h-3 w-40 bg-muted rounded-md" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ================= MESSAGE TREND CHART ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-40 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full bg-muted rounded-lg" />
                </CardContent>
            </Card>

            {/* ================= DISTRIBUTIONS ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="space-y-2">
                            <div className="h-5 w-44 bg-muted rounded-md" />
                            <div className="h-4 w-56 bg-muted rounded-md" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-[220px] w-full bg-muted rounded-lg" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ================= STORAGE TREND ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-52 bg-muted rounded-md" />
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full bg-muted rounded-lg" />
                </CardContent>
            </Card>

            {/* ================= TOP USERS ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>

                <CardContent className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex justify-between items-center border rounded-lg p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-6 bg-muted rounded-md" />
                                <div className="h-10 w-10 bg-muted rounded-full" />
                                <div className="space-y-2">
                                    <div className="h-4 w-20 sm:w-34 bg-muted rounded-md" />
                                    <div className="h-3 w-16 sm:w-24 bg-muted rounded-md" />
                                </div>
                            </div>

                            <div className="h-4 w-6 bg-muted rounded-md" />
                        </div>
                    ))}
                </CardContent>
            </Card>

        </div>
    );
}

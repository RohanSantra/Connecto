"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function MediaSectionSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">

            {/* ================= KPI CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6 space-y-3">
                            <div className="h-3 w-32 bg-muted rounded" />
                            <div className="h-8 w-24 bg-muted rounded" />
                            <div className="h-3 w-40 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ================= CATEGORY DISTRIBUTION ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">

                        {/* Pie chart skeleton */}
                        <div className="w-full aspect-square max-h-[300px] bg-muted rounded-xl mx-auto" />

                        {/* Category list skeleton */}
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="flex justify-between border rounded-lg p-3"
                                >
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-muted rounded" />
                                        <div className="h-3 w-20 bg-muted rounded" />
                                    </div>
                                    <div className="h-4 w-10 bg-muted rounded" />
                                </div>
                            ))}
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* ================= UPLOAD TREND ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>
                <CardContent>
                    <div className="w-full h-[250px] sm:h-[300px] bg-muted rounded-xl" />
                </CardContent>
            </Card>

            {/* ================= STORAGE TREND ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>
                <CardContent>
                    <div className="w-full h-[250px] sm:h-[300px] bg-muted rounded-xl" />
                </CardContent>
            </Card>

        </div>
    );
}

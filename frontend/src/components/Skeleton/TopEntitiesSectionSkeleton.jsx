"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function TopEntitiesSectionSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">

            {/* ================= KPI CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6 space-y-3">
                            <div className="h-3 w-32 bg-muted rounded" />
                            <div className="h-8 w-24 bg-muted rounded" />
                            <div className="h-3 w-40 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ================= DISTRIBUTION + MESSAGE SHARE ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Pie Distribution Card */}
                <Card>
                    <CardHeader className="space-y-2">
                        <div className="h-5 w-44 bg-muted rounded-md" />
                        <div className="h-4 w-60 bg-muted rounded-md" />
                    </CardHeader>

                    <CardContent>
                        <div className="w-full aspect-square max-h-[300px] bg-muted rounded-xl mx-auto" />
                    </CardContent>
                </Card>

                {/* Message Share Card */}
                <Card>
                    <CardHeader className="space-y-2">
                        <div className="h-5 w-44 bg-muted rounded-md" />
                        <div className="h-4 w-60 bg-muted rounded-md" />
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between">
                                    <div className="h-4 w-32 bg-muted rounded" />
                                    <div className="h-4 w-16 bg-muted rounded" />
                                </div>

                                <div className="h-2 bg-muted rounded overflow-hidden">
                                    <div className="h-full w-1/2 bg-muted/70 rounded" />
                                </div>

                                <div className="h-3 w-40 bg-muted rounded" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

            </div>

        </div>
    );
}

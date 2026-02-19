"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function CallsSectionSkeleton() {
    return (
        <div className="space-y-6 sm:space-y-8 animate-pulse">

            {/* ================= HEADER ================= */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div className="space-y-2 w-full sm:w-auto">
                    <div className="h-6 w-40 sm:w-56 bg-muted rounded-md" />
                    <div className="h-4 w-64 sm:w-80 bg-muted rounded-md" />
                </div>

                <div className="h-9 w-full sm:w-32 bg-muted rounded-lg" />
            </div>

            {/* ================= KPI GRID ================= */}
            <div className="
        grid 
        grid-cols-1 
        sm:grid-cols-2 
        lg:grid-cols-3 
        gap-4 sm:gap-6
      ">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-4 sm:p-6 space-y-3">
                            <div className="h-4 w-28 bg-muted rounded-md" />
                            <div className="h-8 w-24 bg-muted rounded-md" />
                            <div className="h-3 w-40 bg-muted rounded-md" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ================= CALL TYPE BREAKDOWN ================= */}
            <Card>
                <CardHeader className="space-y-2 px-4 sm:px-6">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>

                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-6 pb-6">

                    {/* LEFT LIST */}
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-lg border p-4 space-y-3"
                            >
                                <div className="h-4 w-28 bg-muted rounded-md" />
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <div className="h-3 w-20 bg-muted rounded-md" />
                                        <div className="h-3 w-12 bg-muted rounded-md" />
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="h-3 w-24 bg-muted rounded-md" />
                                        <div className="h-3 w-16 bg-muted rounded-md" />
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="h-3 w-28 bg-muted rounded-md" />
                                        <div className="h-3 w-16 bg-muted rounded-md" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT PIE CHART */}
                    <div className="w-full h-[220px] sm:h-[250px] md:h-[280px] bg-muted rounded-lg" />

                </CardContent>
            </Card>

            {/* ================= CALL VOLUME TREND ================= */}
            <Card>
                <CardHeader className="space-y-2 px-4 sm:px-6">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>

                <CardContent className="px-4 sm:px-6 pb-6">
                    <div className="
            w-full 
            h-[220px] 
            sm:h-[260px] 
            md:h-[300px] 
            lg:h-[340px] 
            bg-muted 
            rounded-lg
          " />
                </CardContent>
            </Card>

            {/* ================= DURATION TREND ================= */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="h-5 w-44 bg-muted rounded-md" />
                    <div className="h-4 w-60 bg-muted rounded-md" />
                </CardHeader>

                <CardContent className="px-4 sm:px-6 pb-6">
                    <div className="
            w-full 
            h-[220px] 
            sm:h-[260px] 
            md:h-[300px] 
            lg:h-[340px] 
            bg-muted 
            rounded-lg
          " />
                </CardContent>
            </Card>

        </div>
    );
}

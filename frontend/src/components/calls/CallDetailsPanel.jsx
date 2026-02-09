"use client";

import React, { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Phone, Video, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ---------------- helpers ---------------- */

const Section = ({ title, children }) => (
    <div className="rounded-2xl bg-muted/30 p-4 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
        </h3>
        {children}
    </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium truncate">{value ?? "—"}</p>
        </div>
    </div>
);

const formatDuration = (sec) => {
    if (sec == null) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m && s) return `${m} min ${s} sec`;
    if (m) return `${m} min`;
    return `${s} sec`;
};

const statusBadge = (status) => {
    if (status === "missed") return <Badge variant="destructive">Missed</Badge>;
    if (status === "rejected") return <Badge variant="secondary">Rejected</Badge>;
    return <Badge variant="outline">Ended</Badge>;
};

/* ---------------- main ---------------- */

export default function CallDetailsPanel({ call, open, onClose }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    if (!call) return null;



    const isGroup = !!call.chat?.isGroup;
    const members = call.calleeIds || [];

    const avatar =
        call.metadata?.groupAvatar ||
        call.chat?.groupAvatarUrl ||
        call.metadata?.callerAvatar;

    const title =
        call.metadata?.groupName ||
        call.chat?.name ||
        call.metadata?.callerName ||
        "Call";

    const typeLabel = call.type === "video" ? "Video call" : "Audio call";

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
            <SheetContent
                side={isMobile ? "bottom" : "right"}
                className={cn(
                    "p-0 flex flex-col bg-card",
                    isMobile
                        ? "h-screen rounded-none"
                        : "w-full sm:max-w-3xl border-l shadow-xl"
                )}
            >
                {/* ---------------- Header ---------------- */}
                <SheetHeader className="px-6 py-4 border-b flex items-center justify-between">
                    <div className="mr-auto">
                        <SheetTitle className="text-lg">Call details</SheetTitle>
                    </div>
                </SheetHeader>

                {/* ---------------- Body ---------------- */}
                <ScrollArea className="flex-1 px-6 py-6 space-y-6">
                    {/* ===== Overview ===== */}
                    <div className="flex items-center gap-4 mb-3">
                        <Avatar className="h-16 w-16">
                            {avatar ? (
                                <AvatarImage src={avatar} />
                            ) : (
                                <AvatarFallback className="text-lg">
                                    {title[0]}
                                </AvatarFallback>
                            )}
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-semibold truncate">{title}</p>
                            <p className="text-sm text-muted-foreground">
                                {isGroup
                                    ? `${members.length + 1} participants`
                                    : "1-to-1 call"}
                            </p>
                        </div>

                        {statusBadge(call.status)}
                    </div>

                    {/* ===== Call info ===== */}
                    <Section title="Call overview">
                        <InfoRow
                            icon={call.type === "video" ? Video : Phone}
                            label="Type"
                            value={typeLabel}
                        />
                        <InfoRow
                            icon={Clock}
                            label="Duration"
                            value={formatDuration(call.duration)}
                        />
                    </Section>

                    {/* ===== Timeline ===== */}
                    <div className="mt-3">
                        <Section title="Timeline">
                            <InfoRow
                                icon={Calendar}
                                label="Started"
                                value={
                                    call.startedAt
                                        ? format(new Date(call.startedAt), "PPP • p")
                                        : "—"
                                }
                            />
                            <InfoRow
                                icon={Calendar}
                                label="Ended"
                                value={
                                    call.endedAt
                                        ? format(new Date(call.endedAt), "PPP • p")
                                        : "—"
                                }
                            />
                        </Section>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

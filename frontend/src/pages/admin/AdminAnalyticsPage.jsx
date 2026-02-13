// src/app/(admin)/AdminConsolePage.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  BarChart3,
  Users,
  Phone,
  Image,
  Activity,
  Download,
  RefreshCw,
  Calendar as CalendarIcon,
  Shield,
  Menu,
  ArrowLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import OverviewSection from "@/components/admin/OverviewSection";
import CallsSection from "@/components/admin/CallsSection";
import MediaSection from "@/components/admin/MediaSection";
import TopEntitiesSection from "@/components/admin/TopEntitiesSection";
import UserManagementSection from "@/components/admin/UserManagementSection";
import ActivitySection from "@/components/admin/ActivitySection";

import { useAdminStore } from "@/store/useAdminStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ================= NAV ITEMS ================= */

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "media", label: "Media", icon: Image },
  { key: "top-chats", label: "Top Chats", icon: Users },
  { key: "users", label: "Users", icon: Shield },
  { key: "activity", label: "Activity", icon: Activity },
];

export default function AdminConsolePage() {
  const {
    fetchGlobalStats,
    fetchCallStats,
    fetchMediaStats,
    fetchTopEntities,
    fetchActivityTimeline,
    fetchUserStats,
    globalStats,
    callStats,
    mediaStats,
    topEntities,
    activityTimeline,
    loading,
  } = useAdminStore();

  const [active, setActive] = useState("overview");
  const [from, setFrom] = useState(subDays(new Date(), 30));
  const [to, setTo] = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  // only from / to in params now
  const rangeParams = useMemo(
    () => ({
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
    }),
    [from, to]
  );

  /* ================= FETCH DATA WHEN ACTIVE / RANGE CHANGES ================= */

  useEffect(() => {
    async function load() {
      try {
        if (active === "overview") await fetchGlobalStats(rangeParams);
        else if (active === "calls") await fetchCallStats(rangeParams);
        else if (active === "media") await fetchMediaStats(rangeParams);
        else if (active === "top-chats")
          await fetchTopEntities("chats", { ...rangeParams, limit: 20 });
        else if (active === "users")
          await fetchTopEntities("users", { ...rangeParams, limit: 50 });
        else if (active === "activity")
          // server's activity endpoint expects from/to (we no longer send unit)
          await fetchActivityTimeline(rangeParams);
      } catch (err) {
        toast.error("Failed to load analytics");
      }
    }

    load();
  }, [active, rangeParams, fetchGlobalStats, fetchCallStats, fetchMediaStats, fetchTopEntities, fetchActivityTimeline]);

  /* ================= SAFE DATA ================= */

  const safeGlobal = globalStats || {};
  const safeCalls = callStats || { raw: [], timeseries: [] };
  const safeMedia = mediaStats || {};
  const safeTop = topEntities || { top: [], summary: {} };
  const safeActivity = activityTimeline || { timeline: [], range: rangeParams };

  /* ================= CSV EXPORT (simple) ================= */

  const downloadCSV = (rows, filename) => {
    if (!rows || !rows.length) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(rows[0]);

    const csv =
      headers.join(",") +
      "\n" +
      rows
        .map((row) =>
          headers
            .map((h) => {
              const val = row[h] ?? "";
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    try {
      const from = rangeParams.from;
      const to = rangeParams.to;

      /* ================= OVERVIEW ================= */
      if (active === "overview") {
        const rows = [
          {
            Period_From: safeGlobal.range?.from || from,
            Period_To: safeGlobal.range?.to || to,
            Period_Unit: safeGlobal.period,

            Total_Users: safeGlobal.users?.totalUsers,
            Active_Users: safeGlobal.users?.activeUsers,
            New_Users: safeGlobal.users?.newUsers,

            Total_Messages: safeGlobal.messages?.totalMessages,
            Avg_Messages_Per_Day: safeGlobal.messages?.avgMessagesPerDay,

            Total_Calls: safeGlobal.calls?.totalCalls,

            Total_Storage_Bytes:
              safeGlobal.media?.byCategory?.reduce(
                (sum, m) => sum + (m.bytes || 0),
                0
              ) || 0,
          },
        ];

        return downloadCSV(rows, `overview-${from}-to-${to}.csv`);
      }

      /* ================= CALLS ================= */
      if (active === "calls") {
        const rows = (safeCalls.raw || []).map((c) => ({
          Call_Type: c._id,
          Total_Calls: c.count,
          Avg_Duration_Seconds: c.avgDurationSec,
          Total_Duration_Seconds: c.totalDurationSec,
        }));

        return downloadCSV(rows, `calls-breakdown-${from}-to-${to}.csv`);
      }

      /* ================= CALLS TIMESERIES ================= */
      if (active === "calls-timeseries") {
        const rows = (safeCalls.timeseries || []).map((t) => ({
          Date: t._id,
          Call_Count: t.count,
          Total_Duration_Seconds: t.totalDurationSec,
        }));

        return downloadCSV(rows, `calls-timeseries-${from}-to-${to}.csv`);
      }

      /* ================= MEDIA ================= */
      if (active === "media") {
        const rows = (safeMedia.byCategory || []).map((m) => ({
          Category: m._id,
          File_Count: m.count,
          Storage_Bytes: m.bytes,
        }));

        return downloadCSV(rows, `media-summary-${from}-to-${to}.csv`);
      }

      /* ================= MEDIA TIMESERIES ================= */
      if (active === "media-timeseries") {
        const rows = (safeMedia.timeseries || []).flatMap((bucket) =>
          (bucket.categories || []).map((cat) => ({
            Date: bucket.bucket,
            Category: cat.category,
            File_Count: cat.count,
            Storage_Bytes: cat.bytes,
          }))
        );

        return downloadCSV(rows, `media-timeseries-${from}-to-${to}.csv`);
      }

      /* ================= TOP CHATS ================= */
      if (active === "top-chats") {
        const rows = (safeTop.top || []).map((chat) => ({
          Chat_ID: chat.chatId,
          Chat_Name: chat.name || "Direct Chat",
          Is_Group: chat.isGroup ? "Yes" : "No",
          Message_Count: chat.count,
        }));

        return downloadCSV(rows, `top-chats-${from}-to-${to}.csv`);
      }

      /* ================= USERS ================= */
      if (active === "users") {
        const rows = (safeTop.top || []).map((u) => ({
          User_ID: u.userId,
          Username: u.username,
          Message_Count: u.count,
          Is_Deactivated: u.isDeactivated ? "Yes" : "No",
          Last_Seen: u.lastSeen || "Online",
        }));

        return downloadCSV(rows, `top-users-${from}-to-${to}.csv`);
      }

      /* ================= ACTIVITY ================= */
      if (active === "activity") {
        const rows = (safeActivity.timeline || []).map((t) => ({
          Date: t._id,
          Activity_Count: t.count,
          Unit: safeActivity.unit,
        }));

        return downloadCSV(rows, `activity-${from}-to-${to}.csv`);
      }

      /* ================= MESSAGE TREND ================= */
      if (active === "message-trend") {
        const rows = (safeGlobal.messages?.byPeriod || []).map((m) => ({
          Date: m._id,
          Message_Count: m.count,
        }));

        return downloadCSV(rows, `messages-trend-${from}-to-${to}.csv`);
      }

      /* ================= MESSAGE TYPE ================= */
      if (active === "message-types") {
        const rows = (safeGlobal.messages?.byType || []).map((m) => ({
          Message_Type: m._id,
          Count: m.count,
        }));

        return downloadCSV(rows, `message-types-${from}-to-${to}.csv`);
      }

      /* ================= PEAK HOURS ================= */
      if (active === "peak-hours") {
        const rows = (safeGlobal.peakHours || []).map((h) => ({
          Hour: h._id,
          Activity_Count: h.count,
        }));

        return downloadCSV(rows, `peak-hours-${from}-to-${to}.csv`);
      }

      toast.error("Unsupported export type");
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  };



  /* ================= SIDEBAR (desktop + mobile) ================= */

  const Sidebar = (
    <div className="h-full flex flex-col">
      <div className="hidden lg:flex flex-col px-6 py-6">
        <h2 className="text-xl font-bold tracking-tight">Admin Console</h2>
        <p className="text-xs text-muted-foreground mt-1">Enterprise Dashboard</p>
      </div>
      <Separator />

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <Button
              key={item.key}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setActive(item.key);
                setMobileOpen(false);
              }}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span className="truncate">{item.label}</span>
            </Button>
          );
        })}
      </nav>
    </div>
  );

  /* ================= LAYOUT ================= */

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 border-r bg-muted/30">{Sidebar}</aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">

          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>
              <div className="px-6 py-6">
                <h2 className="text-xl font-bold tracking-tight">Admin Console</h2>
                <p className="text-xs text-muted-foreground mt-1">Enterprise Dashboard</p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {Sidebar}
          </div>

        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Back to Home */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div>
              <h1 className="text-lg md:text-2xl font-semibold capitalize">
                {active.replace("-", " ")}
              </h1>
              <Badge variant="outline" className="mt-1 text-xs">
                {rangeParams.from} → {rangeParams.to}
              </Badge>
            </div>
          </div>


          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={loading}>
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>

            <Button
              size="sm"
              onClick={async () => {
                // re-run the current tab's fetch with the same range
                try {
                  if (active === "overview") await fetchGlobalStats(rangeParams);
                  else if (active === "calls") await fetchCallStats(rangeParams);
                  else if (active === "media") await fetchMediaStats(rangeParams);
                  else if (active === "top-chats")
                    await fetchTopEntities("chats", { ...rangeParams, limit: 20 });
                  else if (active === "users")
                    await fetchTopEntities("users", { ...rangeParams, limit: 50 });
                  else if (active === "activity") await fetchActivityTimeline(rangeParams);

                  toast.success("Refreshed");
                } catch {
                  toast.error("Refresh failed");
                }
              }}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {/* Filter bar */}
        <div className="px-6 py-4 border-b bg-muted/20 shrink-0 flex flex-wrap gap-3 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">From: </span>
                {format(from, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar mode="single" selected={from} onSelect={(d) => d && setFrom(d)} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">To: </span>
                {format(to, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar mode="single" selected={to} onSelect={(d) => d && setTo(d)} />
            </PopoverContent>
          </Popover>

          <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
            Showing data for <strong>{rangeParams.from}</strong> → <strong>{rangeParams.to}</strong>
          </div>
        </div>

        {/* Content area (scrollable) */}
        <div className="flex-1 overflow-y-auto scroll-thumb-only p-6 min-w-0">
          {active === "overview" && <OverviewSection global={safeGlobal} />}

          {active === "calls" && <CallsSection callStats={safeCalls} />}

          {active === "media" && <MediaSection mediaStats={safeMedia} />}

          {active === "top-chats" && <TopEntitiesSection topEntities={safeTop} />}

          {active === "users" && (
            <UserManagementSection
              users={safeTop.top || []}
              onViewUser={(userId) => fetchUserStats(userId, rangeParams)}
            />
          )}

          {active === "activity" && (
            // ActivitySection will use the timeline + range stored on the server response.
            <ActivitySection activityTimeline={safeActivity} />
          )}
        </div>
      </div>
    </div>
  );
}

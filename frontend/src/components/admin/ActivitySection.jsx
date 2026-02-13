"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaWrapper } from "./chart-wrappers";
import { Activity, TrendingUp, CalendarDays } from "lucide-react";

/* ================= Helpers ================= */

function formatNumber(n) {
  return new Intl.NumberFormat().format(Number(n || 0));
}

function generateDateRange(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const arr = [];

  for (
    let d = new Date(start);
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    arr.push(d.toISOString().slice(0, 10));
  }

  return arr;
}

/* ================= Component ================= */

export default function ActivitySection({ activityTimeline }) {
  const timeline = Array.isArray(activityTimeline?.timeline)
    ? activityTimeline.timeline
    : [];

  const from = activityTimeline?.range?.from;
  const to = activityTimeline?.range?.to;

  /* ================= Process Data ================= */

  const { filledData, totalActivity, peakDay, avgPerDay } =
    useMemo(() => {
      if (!timeline.length || !from || !to) {
        return {
          filledData: [],
          totalActivity: 0,
          peakDay: null,
          avgPerDay: 0,
        };
      }

      const map = new Map(
        timeline.map((t) => [t._id, t.count])
      );

      const fullRange = generateDateRange(from, to);

      const filled = fullRange.map((date) => ({
        bucket: date,
        count: map.get(date) || 0,
      }));

      const total = filled.reduce(
        (sum, d) => sum + d.count,
        0
      );

      const peak =
        filled.length > 0
          ? filled.reduce((prev, curr) =>
            prev.count > curr.count ? prev : curr
          )
          : null;

      const avg =
        filled.length > 0 ? total / filled.length : 0;

      return {
        filledData: filled,
        totalActivity: total,
        peakDay: peak,
        avgPerDay: avg,
      };
    }, [timeline, from, to]);

  if (!filledData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            No activity in selected range
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <KpiCard
          icon={<Activity className="w-5 h-5" />}
          title="Total Activity"
          value={formatNumber(totalActivity)}
          description="Total messages in selected range"
        />

        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Peak Day"
          value={
            peakDay
              ? `${formatNumber(peakDay.count)} msgs`
              : "-"
          }
          description={
            peakDay ? peakDay.bucket : "No peak detected"
          }
        />

        <KpiCard
          icon={<CalendarDays className="w-5 h-5" />}
          title="Daily Average"
          value={formatNumber(avgPerDay.toFixed(1))}
          description="Average messages per day"
        />
      </div>

      {/* ================= AREA CHART ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Trend</CardTitle>
          <CardDescription>
            Message activity grouped by{" "}
            {activityTimeline?.unit || "day"}
          </CardDescription>

          <div className="mt-2">
            <Badge variant="secondary">
              {from?.slice(0, 10)} → {to?.slice(0, 10)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <AreaWrapper
            title=" "
            data={filledData}
            xKey="bucket"
            series={[{ key: "count" }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= KPI CARD ================= */

function KpiCard({ icon, title, value, description }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {icon}
          {title}
        </div>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

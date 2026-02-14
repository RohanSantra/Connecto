"use client";

import React, { useMemo, useRef } from "react";
import domtoimage from "dom-to-image-more";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AreaWrapper, PieWrapper } from "./Chart-wrappers";

/* ================= Helpers ================= */

function formatNumber(n) {
  return new Intl.NumberFormat().format(Number(n || 0));
}

function formatDuration(sec) {
  const total = Math.round(Number(sec || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ================= Component ================= */

export default function CallsSection({ callStats }) {
  const exportRef = useRef(null);

  if (!callStats) return null;

  const raw = Array.isArray(callStats.raw) ? callStats.raw : [];
  const timeseries = Array.isArray(callStats.timeseries)
    ? callStats.timeseries
    : [];
  const totalsObj = callStats.totals || {};

  /* ================= OVERVIEW METRICS ================= */

  const totals = useMemo(() => {
    const totalCalls = totalsObj.totalCalls || 0;
    const totalDuration = raw.reduce(
      (s, r) => s + (r.totalDurationSec || 0),
      0
    );
    const avgDuration = totalCalls ? totalDuration / totalCalls : 0;

    return { totalCalls, totalDuration, avgDuration };
  }, [raw, totalsObj]);

  /* ================= DATA TRANSFORM ================= */

  const callTrend = timeseries.map((t) => ({
    date: t._id,
    calls: t.count,
  }));

  const durationTrend = timeseries.map((t) => ({
    date: t._id,
    duration: t.totalDurationSec,
  }));

  const typeDistribution = raw.map((r) => ({
    type: r._id,
    calls: r.count,
  }));

  /* ================= EXPORT ================= */


  async function exportPNG() {
    if (!exportRef.current) return;

    const dataUrl = await domtoimage.toPng(exportRef.current);
    const link = document.createElement("a");
    link.download = "calls-analytics.png";
    link.href = dataUrl;
    link.click();
  }



  if (!raw.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calls Analytics</CardTitle>
          <CardDescription>No calls found in selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div ref={exportRef} className="space-y-8">

      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Calls Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of call activity between selected dates
          </p>
        </div>

        <button
          onClick={exportPNG}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
        >
          Export as PNG
        </button>
      </div>

      {/* ================= OVERVIEW KPI ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Calls"
          description="All audio and video calls combined"
          value={formatNumber(totals.totalCalls)}
        />

        <StatCard
          title="Total Duration"
          description="Combined call time across all sessions"
          value={formatDuration(totals.totalDuration)}
        />

        <StatCard
          title="Average Duration"
          description="Average length per call session"
          value={formatDuration(totals.avgDuration)}
        />
      </div>

      {/* ================= CALL TYPE BREAKDOWN ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Call Type Breakdown</CardTitle>
          <CardDescription>
            Distribution of calls by audio and video categories
          </CardDescription>
        </CardHeader>

        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {raw.map((r) => (
              <div
                key={r._id}
                className="rounded-lg border bg-card p-4"
              >
                <p className="text-sm text-muted-foreground capitalize">
                  {r._id} Calls
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Sessions</span>
                    <span>{formatNumber(r.count)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Duration</span>
                    <span>{formatDuration(r.avgDurationSec)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Duration</span>
                    <span>{formatDuration(r.totalDurationSec)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <PieWrapper
            title=" "
            data={typeDistribution}
            dataKey="calls"
            nameKey="type"
          />
        </CardContent>
      </Card>

      {/* ================= CALL VOLUME TREND ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Call Volume Trend</CardTitle>
          <CardDescription>
            Number of calls grouped by {callStats.period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaWrapper
            title=" "
            data={callTrend}
            xKey="date"
            series={[{ key: "calls" }]}
          />
        </CardContent>
      </Card>

      {/* ================= DURATION TREND ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Call Duration Trend</CardTitle>
          <CardDescription>
            Total call time accumulated per {callStats.period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaWrapper
            title=" "
            data={durationTrend}
            xKey="date"
            series={[{ key: "duration" }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= KPI CARD ================= */

function StatCard({ title, description, value }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-semibold mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

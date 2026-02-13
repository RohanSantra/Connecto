"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AreaWrapper, PieWrapper } from "./chart-wrappers";

/* ================= Helpers ================= */

function formatNumber(n) {
  return new Intl.NumberFormat().format(Number(n || 0));
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (!b) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/* ================= Component ================= */

export default function MediaSection({ mediaStats }) {
  if (!mediaStats) return null;

  const timeseries = Array.isArray(mediaStats.timeseries)
    ? mediaStats.timeseries
    : [];

  /* ================= Transform Data ================= */

  const {
    totalFiles,
    totalBytes,
    categoryTotals,
    uploadTrend,
    storageTrend,
  } = useMemo(() => {
    let totalFiles = 0;
    let totalBytes = 0;
    const categoryMap = new Map();

    const uploadTrend = [];
    const storageTrend = [];

    timeseries.forEach((entry) => {
      let dailyCount = 0;
      let dailyBytes = 0;

      (entry.categories || []).forEach((cat) => {
        const name = cat.category;
        const count = Number(cat.count || 0);
        const bytes = Number(cat.bytes || 0);

        dailyCount += count;
        dailyBytes += bytes;

        if (!categoryMap.has(name)) {
          categoryMap.set(name, { name, count: 0, bytes: 0 });
        }

        const existing = categoryMap.get(name);
        existing.count += count;
        existing.bytes += bytes;
      });

      totalFiles += dailyCount;
      totalBytes += dailyBytes;

      uploadTrend.push({
        date: entry.bucket,
        uploads: dailyCount,
      });

      storageTrend.push({
        date: entry.bucket,
        bytes: dailyBytes,
      });
    });

    return {
      totalFiles,
      totalBytes,
      categoryTotals: Array.from(categoryMap.values()),
      uploadTrend,
      storageTrend,
    };
  }, [timeseries]);

  if (!timeseries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media Analytics</CardTitle>
          <CardDescription>No media activity in selected range</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Files Uploaded"
          description="Total attachments sent"
          value={formatNumber(totalFiles)}
        />

        <StatCard
          title="Total Storage Used"
          description="Combined file size"
          value={formatBytes(totalBytes)}
        />

        <StatCard
          title="Avg File Size"
          description="Per uploaded attachment"
          value={
            totalFiles
              ? formatBytes(totalBytes / totalFiles)
              : "0 B"
          }
        />
      </div>

      {/* ================= CATEGORY DISTRIBUTION ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Media Category Distribution</CardTitle>
          <CardDescription>
            Breakdown of uploaded files by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            <PieWrapper
              title=" "
              data={categoryTotals}
              dataKey="count"
              nameKey="name"
            />

            <div className="space-y-3">
              {categoryTotals.map((c) => (
                <div
                  key={c.name}
                  className="flex justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="capitalize font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(c.bytes)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatNumber(c.count)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= UPLOAD TREND ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Activity Trend</CardTitle>
          <CardDescription>
            Number of attachments uploaded per {mediaStats.period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaWrapper
            title=" "
            data={uploadTrend}
            xKey="date"
            series={[{ key: "uploads" }]}
          />
        </CardContent>
      </Card>

      {/* ================= STORAGE TREND ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Growth Trend</CardTitle>
          <CardDescription>
            Storage consumption over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaWrapper
            title=" "
            data={storageTrend}
            xKey="date"
            series={[{ key: "bytes" }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= KPI Card ================= */

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

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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AreaWrapper, PieWrapper } from "./Chart-wrappers";
import {
  Users,
  MessageSquare,
  Phone,
  Image,
  TrendingUp,
  HardDrive,
} from "lucide-react";

/* ================= Helpers ================= */

function formatNumber(n) {
  return new Intl.NumberFormat().format(Number(n || 0));
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ================= Component ================= */

export default function OverviewSection({ global = {}, unit }) {
  const users = global.users || {};
  const messages = global.messages || {};
  const calls = global.calls || {};
  const media = global.media || {};
  const range = global.range || {};

  const messageTrend = Array.isArray(messages.byPeriod)
    ? messages.byPeriod.map((m) => ({
      bucket: m._id,
      count: m.count,
    }))
    : [];

  const messageTypes = Array.isArray(messages.byType)
    ? messages.byType.map((m) => ({
      type: m._id || "unknown",
      value: m.count,
    }))
    : [];

  const mediaData = Array.isArray(media.byCategory)
    ? media.byCategory.map((m) => ({
      type: m._id,
      value: m.count,
    }))
    : [];

  const storageTrend = Array.isArray(global.storageTrend)
    ? global.storageTrend.map((s) => ({
      bucket: s._id,
      bytes: s.totalBytes,
    }))
    : [];

  const topUsers = Array.isArray(global.topUsers)
    ? global.topUsers.slice(0, 5)
    : [];

  const totalStorage = useMemo(() => {
    return (media.byCategory || []).reduce(
      (sum, m) => sum + (m.bytes || 0),
      0
    );
  }, [media]);

  return (
    <div className="space-y-8">

      {/* ================= DATE RANGE ================= */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">
            Executive Overview
          </h2>
          <p className="text-sm text-muted-foreground">
            Consolidated analytics snapshot for the selected reporting period
          </p>
        </div>

        {range.from && (
          <Badge variant="secondary">
            {range.from.slice(0, 10)} → {range.to.slice(0, 10)}
          </Badge>
        )}
      </div>

      {/* ================= KPI GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <KpiCard
          icon={<Users className="w-5 h-5" />}
          title="Registered Users"
          value={formatNumber(users.totalUsers)}
          description={`${formatNumber(users.activeUsers)} currently active`}
        />

        <KpiCard
          icon={<MessageSquare className="w-5 h-5" />}
          title="Total Volume"
          value={formatNumber(messages.totalMessages)}
          description={`${formatNumber(messages.avgMessagesPerDay)} daily average`}
        />

        <KpiCard
          icon={<Phone className="w-5 h-5" />}
          title="Call Sessions"
          value={formatNumber(calls.totalCalls)}
          description="Audio & video communication sessions"
        />

        <KpiCard
          icon={<HardDrive className="w-5 h-5" />}
          title="Media Storage Consumption"
          value={formatBytes(totalStorage)}
          description="Total attachment storage utilized"
        />

      </div>

      {/* ================= MESSAGE TREND ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Message Growth Trend</CardTitle>
          <CardDescription>
            Messages grouped by {unit || global.period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaWrapper
            title=" "
            data={messageTrend}
            xKey="bucket"
            series={[{ key: "count" }]}
          />
        </CardContent>
      </Card>

      {/* ================= DISTRIBUTIONS ================= */}
      <div className="grid lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>Message Type Distribution</CardTitle>
            <CardDescription>
              Text vs media messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PieWrapper
              title=" "
              data={messageTypes}
              dataKey="value"
              nameKey="type"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media Category Breakdown</CardTitle>
            <CardDescription>
              Attachments by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PieWrapper
              title=" "
              data={mediaData}
              dataKey="value"
              nameKey="type"
            />
          </CardContent>
        </Card>

      </div>

      {/* ================= STORAGE TREND ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Growth Trend</CardTitle>
          <CardDescription>
            Attachment storage over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaWrapper
            title=" "
            data={storageTrend}
            xKey="bucket"
            series={[{ key: "bytes" }]}
          />
        </CardContent>
      </Card>

      {/* ================= TOP USERS PREVIEW ================= */}
      {topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Active Users</CardTitle>
            <CardDescription>
              Highest contributors in selected range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topUsers.map((u, i) => (
              <div
                key={u.userId}
                className="flex justify-between items-center border rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">
                    #{i + 1}
                  </span>

                  <Avatar>
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback>
                      {getInitials(u.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="font-medium">
                      {u.username || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(u.count)} messages
                    </p>
                  </div>
                </div>

                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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

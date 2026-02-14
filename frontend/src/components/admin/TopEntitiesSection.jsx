"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { PieWrapper } from "./Chart-wrappers";

/* ================= Helpers ================= */

function formatNumber(n) {
  return new Intl.NumberFormat().format(Number(n || 0));
}

/* ================= Component ================= */

export default function TopEntitiesSection({ topEntities }) {
  if (!topEntities) return null;

  const summary = topEntities.summary || {};
  const top = Array.isArray(topEntities.top) ? topEntities.top : [];

  /* ================= Derived Metrics ================= */

  const {
    totalChats,
    groupChats,
    directChats,
    totalMessages,
    groupMessages,
    directMessages,
    distributionData,
  } = useMemo(() => {
    const totalChats = Number(summary.total || top.length || 0);
    const groupChats =
      typeof summary.groups === "number"
        ? summary.groups
        : top.filter((t) => t.isGroup).length;

    const directChats = totalChats - groupChats;

    let totalMessages = 0;
    let groupMessages = 0;
    let directMessages = 0;

    top.forEach((chat) => {
      const count = Number(chat.count || 0);
      totalMessages += count;
      if (chat.isGroup) groupMessages += count;
      else directMessages += count;
    });

    const distributionData = [
      { type: "Groups", value: groupChats },
      { type: "Direct", value: directChats },
    ];

    return {
      totalChats,
      groupChats,
      directChats,
      totalMessages,
      groupMessages,
      directMessages,
      distributionData,
    };
  }, [summary, top]);

  if (!top.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Chats</CardTitle>
          <CardDescription>No chat activity found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Top Chats Analyzed"
          description="Number of highest activity chats"
          value={formatNumber(totalChats)}
        />

        <StatCard
          title="Group Chats"
          description="Collaborative conversations"
          value={formatNumber(groupChats)}
        />

        <StatCard
          title="Direct Chats"
          description="1:1 conversations"
          value={formatNumber(directChats)}
        />

        <StatCard
          title="Total Messages"
          description="Messages across top chats"
          value={formatNumber(totalMessages)}
        />
      </div>

      {/* ================= DISTRIBUTION + MESSAGE SHARE ================= */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Chat Type Distribution</CardTitle>
            <CardDescription>
              Ratio of group vs direct chats among top entities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PieWrapper
              title=" "
              data={distributionData}
              dataKey="value"
              nameKey="type"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Share Analysis</CardTitle>
            <CardDescription>
              Message contribution by chat type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShareBlock
              label="Group Messages"
              value={formatNumber(groupMessages)}
              percentage={
                totalMessages
                  ? ((groupMessages / totalMessages) * 100).toFixed(1)
                  : 0
              }
            />

            <ShareBlock
              label="Direct Messages"
              value={formatNumber(directMessages)}
              percentage={
                totalMessages
                  ? ((directMessages / totalMessages) * 100).toFixed(1)
                  : 0
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* ================= RANKED CHAT LIST ================= */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Top Chat Ranking</CardTitle>
          <CardDescription>
            Chats ranked by message volume in selected range
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {top.map((chat, index) => (
            <div
              key={chat.chatId}
              className="flex justify-between items-center border rounded-lg p-4"
            >
              <div>
                <p className="font-medium">
                  #{index + 1}{" "}
                  {chat.name || "Direct Conversation"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {chat.isGroup ? "Group Chat" : "Direct Chat"}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold">
                  {formatNumber(chat.count)} messages
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalMessages
                    ? (
                        (chat.count / totalMessages) *
                        100
                      ).toFixed(1)
                    : 0}
                  % of total
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card> */}
    </div>
  );
}

/* ================= UI Components ================= */

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

function ShareBlock({ label, value, percentage }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between">
        <span className="text-muted-foreground text-sm">
          {label}
        </span>
        <span className="font-medium">{value}</span>
      </div>

      <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-1">
        {percentage}% of total messages
      </p>
    </div>
  );
}

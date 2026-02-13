"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  Crown,
  Medal,
  MessageSquare,
  Activity,
  User,
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAdminStore } from "@/store/useAdminStore";
import { useProfileStore } from "@/store/useProfileStore";

/* ================= Helpers ================= */

function formatNumber(n) {
  if (n == null || isNaN(Number(n))) return "-";
  return new Intl.NumberFormat().format(Number(n));
}

function formatLastSeen(date) {
  if (date === null) return null; // explicit null => online
  if (!date) return "Never active";
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ================= Component ================= */

export default function UserManagementSection({ users = [] }) {
  const { promoteUser, demoteUser, loading } = useAdminStore();
  // profile shape may vary: { userId } or { _id } — try both
  const profile = useProfileStore((s) => s.profile || s.user || {});
  const currentUserId = profile?.userId || profile?._id || null;

  /* ================= Derived Analytics ================= */
  const { totalMessages, avgMessages, topPerformer } = useMemo(() => {
    const total = (Array.isArray(users) ? users : []).reduce(
      (sum, u) => sum + Number(u.count || 0),
      0
    );

    const avg = users && users.length ? total / users.length : 0;

    const top =
      users && users.length
        ? users.reduce((prev, curr) =>
            Number(prev.count || 0) >= Number(curr.count || 0) ? prev : curr
          )
        : null;

    return { totalMessages: total, avgMessages: avg, topPerformer: top };
  }, [users]);

  if (!users || users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Active Users</CardTitle>
          <CardDescription>No user activity found in selected period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* ================= KPI SECTION ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <KpiCard
          icon={<User className="w-5 h-5" />}
          title="Users Analyzed"
          value={formatNumber(users.length)}
          description="Top contributors in selected range"
        />

        <KpiCard
          icon={<MessageSquare className="w-5 h-5" />}
          title="Total Messages"
          value={formatNumber(totalMessages)}
          description="Combined message volume"
        />

        <KpiCard
          icon={<Activity className="w-5 h-5" />}
          title="Average Messages"
          value={formatNumber(Number(avgMessages || 0).toFixed(1))}
          description="Average messages per user"
        />
      </div>

      {/* ================= TOP PERFORMER ================= */}
      {topPerformer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Top Performer
            </CardTitle>
            <CardDescription>Highest message contributor during this period</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={topPerformer.avatarUrl || undefined} />
              <AvatarFallback>{getInitials(topPerformer.username)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate">{topPerformer.username || "Unknown User"}</p>
              <p className="text-muted-foreground text-sm">{formatNumber(topPerformer.count || 0)} messages</p>
            </div>

            <div className="mt-2 sm:mt-0">
              <Badge variant="secondary">#{(users.findIndex((u) => String(u.userId) === String(topPerformer.userId)) + 1) || "-"}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= USER RANKING LIST ================= */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity Ranking</CardTitle>
          <CardDescription>Ranked by message count within selected time range</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {users.map((u, index) => {
            const count = Number(u.count || 0);
            const percentage = totalMessages > 0 ? ((count / totalMessages) * 100) : 0;
            const pct = Math.max(0, Math.min(100, Number(percentage)));
            const rankIcon = index === 0 ? <Trophy className="w-4 h-4 text-primary" /> : index === 1 ? <Medal className="w-4 h-4 text-muted-foreground" /> : null;
            const isSelf = currentUserId && String(u.userId) === String(currentUserId);
            const lastSeenText = formatLastSeen(u.lastSeen);

            return (
              <div
                key={u.userId || index}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border hover:bg-muted/40 transition"
              >
                {/* LEFT SIDE */}
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="w-6 text-sm text-muted-foreground shrink-0">#{index + 1}</div>

                  <div className="shrink-0">{rankIcon}</div>

                  <Avatar className="shrink-0">
                    <AvatarImage src={u.avatarUrl || undefined} />
                    <AvatarFallback>{getInitials(u.username)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{u.username || u.userId}</p>

                      {u.isDeactivated ? (
                        <Badge variant="destructive" className="text-xs">
                          <ShieldOff className="w-3 h-3 mr-1" />
                          Deactivated
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}

                      {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-1">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(count)} messages • {Number(percentage).toFixed(1)}% of total
                        </p>

                        <div className="mt-2">
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{
                                width: `${pct}%`,
                                minWidth: pct > 0 && pct < 1 ? "6px" : undefined,
                              }}
                              aria-valuenow={Math.round(pct)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              role="progressbar"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:block text-xs text-muted-foreground text-right w-36">
                        {u.lastSeen === null ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span>Online</span>
                          </div>
                        ) : (
                          <div>
                            Last seen:
                            <div className="text-xs">{lastSeenText}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* small-screen last seen */}
                    <div className="block sm:hidden mt-2 text-xs text-muted-foreground">
                      {u.lastSeen === null ? (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span>Online</span>
                        </div>
                      ) : (
                        <div>Last seen: {lastSeenText}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTIONS (hidden for self; dropdown style) */}
                <div className="flex items-center gap-2">
                  {!isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" aria-label={`Actions for ${u.username || u.userId}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => promoteUser(u.userId)} disabled={loading}>
                          Promote to Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => demoteUser(u.userId)} disabled={loading}>
                          Remove Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
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
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

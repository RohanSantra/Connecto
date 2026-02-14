// src/components/admin/UserManagementSection.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Activity, User, ShieldCheck, ShieldOff, MoreHorizontal, Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAdminStore } from "@/store/useAdminStore";
import { useProfileStore } from "@/store/useProfileStore";
import { toast } from "sonner";

/* ========== Helpers ========== */

function formatNumber(n) {
  if (n == null || isNaN(Number(n))) return "-";
  return new Intl.NumberFormat().format(Number(n));
}

function formatLastSeen(date) {
  if (date === null) return null; // explicit null => online
  if (!date) return "Never active";
  try {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(date);
  }
}

function getInitials(nameOrEmailOrId) {
  if (!nameOrEmailOrId) return "U";
  const s = String(nameOrEmailOrId).trim();
  if (s.includes(" ")) {
    const parts = s.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase().slice(0, 2);
  }
  // if it's an email or single token, use first two chars (letters)
  const match = s.replace(/[^A-Za-z]/g, "");
  if (match.length >= 2) return match.slice(0, 2).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

/* ========== Component ========== */

export default function UserManagementSection({ users = [] }) {
  const { promoteUser, demoteUser, loading: adminLoading } = useAdminStore();
  const profile = useProfileStore((s) => s.profile || s.user || {});
  const currentUserId = profile?.userId || profile?._id || null;

  // local copy so we can optimistically update after promote/demote
  const [localUsers, setLocalUsers] = useState(Array.isArray(users) ? users : []);

  // filters / UI
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | deactivated
  const [roleFilter, setRoleFilter] = useState("all"); // all | admin | user
  const [sortBy, setSortBy] = useState("createdAt"); // createdAt | count
  const [sortOrder, setSortOrder] = useState("desc"); // desc | asc
  const [perPage, setPerPage] = useState(30);
  const [page, setPage] = useState(1);

  // keep localUsers in sync if prop changes
  useEffect(() => {
    setLocalUsers(Array.isArray(users) ? users : []);
  }, [users]);

  // debounce simple
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // derived stats
  const { totalMessages, avgMessages } = useMemo(() => {
    const total = localUsers.reduce((sum, u) => sum + Number(u.count || 0), 0);
    const avg = localUsers.length ? total / localUsers.length : 0;
    return { totalMessages: total, avgMessages: avg };
  }, [localUsers]);

  // client-side filtering
  const filtered = useMemo(() => {
    const arr = Array.isArray(localUsers) ? [...localUsers] : [];
    const qLower = debouncedQ.toLowerCase();

    return arr.filter((u) => {
      // status filter
      if (statusFilter === "active" && u.isDeactivated) return false;
      if (statusFilter === "deactivated" && !u.isDeactivated) return false;

      // role filter
      if (roleFilter === "admin" && !u.isAdmin) return false;
      if (roleFilter === "user" && u.isAdmin) return false;

      // search
      if (!qLower) return true;
      const username = (u.username || "").toString().toLowerCase();
      const email = (u.email || "").toString().toLowerCase();
      const id = (u.userId || "").toString().toLowerCase();
      return username.includes(qLower) || email.includes(qLower) || id.includes(qLower);
    });
  }, [localUsers, debouncedQ, statusFilter, roleFilter]);

  // sorting: admins first, then by chosen sort (new -> old default)
  const sorted = useMemo(() => {
    const arr = Array.isArray(filtered) ? [...filtered] : [];
    const tstamp = (d) => {
      const v = d ? Date.parse(d) : 0;
      return Number.isFinite(v) ? v : 0;
    };

    arr.sort((a, b) => {
      // admins pinned top
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;

      // if same admin status, sort by chosen field
      if (sortBy === "createdAt") {
        const cmp = tstamp(a.createdAt) - tstamp(b.createdAt);
        return sortOrder === "asc" ? cmp : -cmp; // asc: old->new, desc: new->old
      } else {
        // sort by count numeric
        const cmp = (Number(a.count || 0) - Number(b.count || 0));
        return sortOrder === "asc" ? cmp : -cmp;
      }
    });

    return arr;
  }, [filtered, sortBy, sortOrder]);

  // pagination slice
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [sorted, page, perPage]);

  // actions — optimistic update + error handling
  const handlePromote = useCallback(
    async (userId) => {
      try {
        // optimistic UI
        setLocalUsers((prev) => prev.map((u) => (String(u.userId) === String(userId) ? { ...u, isAdmin: true } : u)));
        await promoteUser(userId);
        toast.success("Promoted to admin");
      } catch (err) {
        // revert on error
        setLocalUsers((prev) => prev.map((u) => (String(u.userId) === String(userId) ? { ...u, isAdmin: false } : u)));
        console.error("Promote failed:", err);
        toast.error("Promote failed");
      }
    },
    [promoteUser]
  );

  const handleDemote = useCallback(
    async (userId) => {
      try {
        setLocalUsers((prev) => prev.map((u) => (String(u.userId) === String(userId) ? { ...u, isAdmin: false } : u)));
        await demoteUser(userId);
        toast.success("Removed admin");
      } catch (err) {
        setLocalUsers((prev) => prev.map((u) => (String(u.userId) === String(userId) ? { ...u, isAdmin: true } : u)));
        console.error("Demote failed:", err);
        toast.error("Demote failed");
      }
    },
    [demoteUser]
  );

  return (
    <div className="space-y-6">
      {/* Filters + Search */}
      <div className="flex flex-col gap-3 items-start">
        <div className="flex items-center gap-2 w-full">
          <div className="bg-card pr-3 py-2 rounded-md flex items-center gap-2 w-full shadow-sm">
            <Search className="w-4 h-4 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Search username or email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="border-0 bg-transparent"
              aria-label="Search users"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setDebouncedQ("");
                setPage(1);
              }}
              aria-label="Clear search"
              className="ml-auto"
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Status:{" "}
                {statusFilter === "all"
                  ? "All"
                  : statusFilter === "active"
                    ? "Active"
                    : "Deactivated"}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                }}
              >
                Active
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setStatusFilter("deactivated");
                  setPage(1);
                }}
              >
                Deactivated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Role Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Role:{" "}
                {roleFilter === "all"
                  ? "All"
                  : roleFilter === "admin"
                    ? "Admin"
                    : "User"}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("all");
                  setPage(1);
                }}
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("admin");
                  setPage(1);
                }}
              >
                Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRoleFilter("user");
                  setPage(1);
                }}
              >
                User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort:{" "}
                {sortBy === "createdAt" ? "Created" : "Messages"}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("createdAt")}>
                Created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("count")}>
                Messages
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Order */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {sortOrder === "desc" ? "Descending" : "Ascending"}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOrder("desc")}>
                Descending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("asc")}>
                Ascending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Per Page */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Per Page: {perPage}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[10, 20, 30, 50].map((n) => (
                <DropdownMenuItem
                  key={n}
                  onClick={() => {
                    setPerPage(n);
                    setPage(1);
                  }}
                >
                  {n}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <User className="w-5 h-5" />
              Users
            </div>
            <p className="text-2xl font-semibold">{formatNumber(localUsers.length)}</p>
            <p className="text-xs text-muted-foreground">Loaded / available</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ShieldCheck className="w-5 h-5" />
              Admins
            </div>
            <p className="text-2xl font-semibold">{formatNumber(localUsers.filter((u) => u.isAdmin).length)}</p>
            <p className="text-xs text-muted-foreground">Admins appear first</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="w-5 h-5" />
              Avg messages
            </div>
            <p className="text-2xl font-semibold">{formatNumber(Math.round(avgMessages || 0))}</p>
            <p className="text-xs text-muted-foreground">Average across loaded users</p>
          </CardContent>
        </Card>
      </div>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Admins pinned on top, then newest → oldest (or by messages if selected).</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {pageItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">No users found</div>
          ) : (
            <ul className="space-y-3" role="list" aria-live="polite">
              {pageItems.map((u, idx) => {
                const globalIndex = (page - 1) * perPage + idx + 1;
                const isSelf = currentUserId && String(u.userId) === String(currentUserId);
                const lastSeenText = formatLastSeen(u.lastSeen);

                return (
                  <li
                    key={u.userId || idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border hover:bg-muted/40 transition"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 w-full sm:w-auto">
                      <div className="text-sm text-muted-foreground w-8 shrink-0">#{globalIndex}</div>

                      <Avatar className="shrink-0">
                        {/* avatarUrl can be remote or local path */}
                        {u.avatarUrl ? <AvatarImage src={u.avatarUrl} /> : <AvatarFallback>{getInitials(u.username || u.email || u.userId)}</AvatarFallback>}
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium truncate max-w-[240px]">{u.username ?? u.email ?? u.userId}</div>

                          {u.isDeactivated ? (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                              <ShieldOff className="w-3 h-3" />
                              <span>Deactivated</span>
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Active</span>
                            </Badge>
                          )}

                          {u.isAdmin && <Badge variant="outline" className="text-xs">Admin</Badge>}
                          {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                        </div>

                        <div className="text-xs text-muted-foreground truncate max-w-[360px]">
                          {u.email ? <span>{u.email} • </span> : null}
                          Created: {new Date(u.createdAt).toLocaleString()}
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

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-xs text-muted-foreground text-right mr-2">{formatNumber(u.count)} msgs</div>

                      {/* last-seen on larger screens */}
                      <div className="hidden sm:block text-xs text-muted-foreground text-right w-40">
                        {u.lastSeen === null ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span>Online</span>
                          </div>
                        ) : (
                          <div>Last seen: <div className="text-xs">{lastSeenText}</div></div>
                        )}
                      </div>

                      {/* actions */}
                      {!isSelf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" aria-label={`Actions for ${u.username || u.userId}`} disabled={adminLoading}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            {!u.isAdmin ? (
                              <DropdownMenuItem onClick={() => handlePromote(u.userId)} disabled={adminLoading}>
                                Promote to Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleDemote(u.userId)} disabled={adminLoading}>
                                Remove Admin
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* pagination controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <Button size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

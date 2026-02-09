"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Search,
  ArrowLeft,
  RefreshCw,
  Download,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import CallDetailsPanel from "@/components/calls/CallDetailsPanel";
import useCallStore from "@/store/useCallStore";

/* helpers */
function groupByDate(items = []) {
  const map = new Map();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  items.forEach((it) => {
    const d = new Date(it.startedAt || Date.now());
    let label;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = format(d, "dd MMM yyyy");

    if (!map.has(label)) map.set(label, []);
    map.get(label).push(it);
  });

  return Array.from(map.entries());
}

export default function CallHistoryPage() {
  const navigate = useNavigate();
  const sentinelRef = useRef(null);
  const [selectedCall, setSelectedCall] = useState(null);

  // local search input (debounced to avoid rapid auto-fetch)
  const [searchInput, setSearchInput] = useState("");
  const searchDebounceRef = useRef(null);

  // local date selection (Date or null). This mirrors store.callHistory.date.
  const [localDate, setLocalDate] = useState(null);

  // store
  const {
    callHistory,
    setCallHistoryFilters,
    resetCallHistoryFilters,
    fetchCallHistory,
    getVisibleCallHistory,
    exportCallHistoryCSV,
  } = useCallStore();

  const {
    rows,
    loading,
    error,
    hasMore,
    type,
    status,
    date,
    q,
  } = callHistory;

  // seed local inputs from store on changes (keeps UI in sync)
  useEffect(() => {
    setSearchInput(q || "");
    setLocalDate(date ? new Date(date) : null);
  }, [q, date]);

  // initial load (single call)
  useEffect(() => {
    fetchCallHistory({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          fetchCallHistory();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading, hasMore, fetchCallHistory]);

  // debounce searchInput and push to store.q (live-ish UX)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCallHistoryFilters({ q: searchInput || "" }); // store auto-fetches
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput, setCallHistoryFilters]);

  // derived visible rows (store selector already handles status filter)
  const visibleRows = useMemo(() => getVisibleCallHistory(), [rows, status, getVisibleCallHistory]);
  const grouped = useMemo(() => groupByDate(visibleRows), [visibleRows]);

  const resolveAvatar = (r) =>
    r.metadata?.groupAvatar || r.chat?.groupAvatarUrl || r.metadata?.callerAvatar || null;
  const resolveName = (r) =>
    r.metadata?.groupName || r.chat?.name || r.metadata?.callerName || "Call";


  // resets filters using the store method
  const onReset = () => {
    setSearchInput("");
    setLocalDate(null);
    resetCallHistoryFilters(); // store will reset and auto-fetch
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex-col items-center gap-3">
          <div>
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)} aria-label="Back" className="mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
              <h1 className="text-2xl font-semibold">Call History</h1>
              <p className="text-sm text-muted-foreground">See detailed records of audio and video calls, including participants, duration, and call status.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onReset} title="Reset filters" aria-label="Reset">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>

          <Button size="sm" variant="outline" onClick={exportCallHistoryCSV}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-4 items-center">
        {/* search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search chat or participant"
            className="w-full pl-10 pr-3 py-2 border rounded-md"
          />
        </div>

        {/* type */}
        <div>
          <Select value={type} onValueChange={(v) => setCallHistoryFilters({ type: v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* status */}
        <div>
          <Select value={status} onValueChange={(v) => setCallHistoryFilters({ status: v })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* date (single) */}
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {localDate ? format(new Date(localDate), "MMM d, yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-2">
              <Calendar
                mode="single"
                selected={localDate}
                onSelect={(d) => {
                  const newDate = d ? startOfDay(d) : null;
                  setLocalDate(newDate);
                  // live apply single-date filter
                  setCallHistoryFilters({ date: newDate });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* list */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        {grouped.length === 0 && !loading ? (
          <div className="p-6 text-center text-muted-foreground">No call history found.</div>
        ) : (
          grouped.map(([label, items]) => (
            <section key={label} className="px-4 py-4 border-b last:border-b-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium">
                    <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground ml-2">{items.length} item{items.length > 1 ? "s" : ""}</div>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((r) => (
                  <article
                    key={r._id}
                    className="flex gap-3 p-3 rounded-xl border hover:bg-muted/40 transition cursor-pointer"
                    onClick={() => setSelectedCall(r)}
                  >
                    <Avatar className="h-10 w-10">
                      {resolveAvatar(r) ? <AvatarImage src={resolveAvatar(r)} /> : <AvatarFallback>{resolveName(r)[0]}</AvatarFallback>}
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{resolveName(r)}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.type} • {r.status} {r.chat?.isGroup ? `• ${(r.calleeIds || []).length + 1} members` : ""}</div>
                        </div>

                        <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                          {r.startedAt ? format(new Date(r.startedAt), "p") : "-"}
                          <div className="text-[11px] text-muted-foreground/80">{r.startedAt ? format(new Date(r.startedAt), "PPP") : ""}</div>
                        </div>
                      </div>

                      {r.endedAt && (
                        <div className="mt-2 text-[12px] text-muted-foreground/80">
                          Duration: {r.duration != null ? `${Math.floor(r.duration / 60)}m ${r.duration % 60}s` : "-"} • Ended {format(new Date(r.endedAt), "PPP p")}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}

        {loading && <div className="p-4 text-center text-muted-foreground">Loading…</div>}
        <div ref={sentinelRef} className="h-1" />
      </div>

      <CallDetailsPanel call={selectedCall} open={!!selectedCall} onClose={() => setSelectedCall(null)} />

      {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
    </div>
  );
}

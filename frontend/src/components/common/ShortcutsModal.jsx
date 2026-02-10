"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SHORTCUTS } from "@/constants";
import { useUIStore } from "@/store/useUIStore";
import { X, Search as SearchIcon } from "lucide-react";
import ConnectoLogo from "@/components/common/ConnectoLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * ShortcutsModal
 * - searchable overlay
 * - grouped results with counts
 * - highlight matching substrings
 * - keyboard friendly: Esc closes, "/" focuses search when modal open
 */
export default function ShortcutsModal() {
  const helpOpen = useUIStore((s) => s.helpOpen);
  const closeHelp = useUIStore((s) => s.closeHelp);

  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  // focus search input when opened
  useEffect(() => {
    if (!helpOpen) return;
    setTimeout(() => {
      searchRef.current?.focus?.();
      searchRef.current?.select?.();
    }, 60);
  }, [helpOpen]);

  // lock body scroll while open
  useEffect(() => {
    if (helpOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [helpOpen]);

  // scoped escape handling + "/" to focus search
  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeHelp();
      } else if (e.key === "/" && document.activeElement !== searchRef.current) {
        // if user hits / inside modal, focus the search input
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, closeHelp]);

  // clear query when modal closes
  useEffect(() => {
    if (!helpOpen) setQuery("");
  }, [helpOpen]);

  // normalize search
  const q = (query || "").trim().toLowerCase();

  // derive filtered groups and counts
  const filtered = useMemo(() => {
    if (!q) {
      // return original structure with counts
      return SHORTCUTS.map((g) => ({ ...g, count: g.items?.length || 0 }));
    }

    const groups = SHORTCUTS.map((group) => {
      const items = (group.items || []).filter((it) => {
        const keysText = (it.keys || []).join(" ").toLowerCase();
        return (
          String(it.description || "").toLowerCase().includes(q) ||
          keysText.includes(q)
        );
      });
      return { ...group, items, count: items.length };
    }).filter((g) => (g.count || 0) > 0);

    return groups;
  }, [q]);

  // total results
  const totalResults = filtered.reduce((s, g) => s + (g.count || 0), 0);

  if (!helpOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-5xl h-[90%] bg-card rounded-2xl border p-6 text-sm shadow-2xl overflow-hidden">
        {/* Header + Search (sticky) */}
        <div className="sticky top-0 bg-card/60 backdrop-blur-sm -mx-6 px-6 pt-4 pb-3 z-10 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ConnectoLogo size={36} />
              <div>
                <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                <p className="text-xs text-muted-foreground">
                  Quick keys to speed up your workflow — navigate, create chats, manage calls, and more.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={closeHelp} aria-label="Close shortcuts">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <SearchIcon className="w-4 h-4" />
              </span>

              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shortcuts (try “call”, “chat”, or keys like `Ctrl`)"
                className="pl-9 pr-4 rounded-lg"
                aria-label="Search shortcuts"
              />
            </div>

            <div className="text-xs text-muted-foreground select-none">
              Results: <span className="font-medium text-foreground">{totalResults}</span>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="mt-4 h-[calc(100%-136px)] overflow-y-auto p-1 scroll-thumb-only">
          {totalResults === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="rounded-full bg-muted/10 p-4">
                <SearchIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">No shortcuts found</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Try different words (e.g., "call", "search", "devices") or clear the search.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((group) => (
                <div key={group.group} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {group.group}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {group.count} {group.count === 1 ? "item" : "items"}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {(group.items || []).map((it, idx) => (
                      <li
                        key={idx}
                        className={cn(
                          "flex items-center justify-between gap-4 rounded-md px-3 py-2",
                          "hover:bg-muted/10 transition"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            <Highlight text={it.description} query={q} />
                          </div>
                          {it.note && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {it.note}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 items-center shrink-0">
                          {renderKeys(it.keys)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Tip: press{" "}
            <kbd className="px-2 py-0.5 rounded bg-muted border">Ctrl</kbd>{" "}
            (or{" "}
            <kbd className="px-2 py-0.5 rounded bg-muted border">Cmd</kbd> on macOS) +{" "}
            <kbd className="px-2 py-0.5 rounded bg-muted border">/</kbd> anytime to open this overlay.
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs">Press <kbd className="px-2 py-0.5 rounded bg-muted border">Esc</kbd> to close</div>
            <Button size="sm" variant="ghost" onClick={closeHelp}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function renderKeys(keys = []) {
  if (!Array.isArray(keys)) keys = [keys];
  return (
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-muted border text-[11px] font-medium"
        >
          {k}
        </kbd>
      ))}
    </div>
  );
}

/** Highlight matching query substring in text using <mark> */
function Highlight({ text = "", query = "" }) {
  if (!query) return <span>{text}</span>;

  // escape regex chars
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc(query)})`, "ig"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

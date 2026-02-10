"use client";

import React, { useMemo, useState } from "react";
import { SHORTCUTS } from "@/constants";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShortcutsSection() {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return SHORTCUTS.map((g) => ({
        ...g,
        count: g.items.length,
      }));
    }

    return SHORTCUTS.map((group) => {
      const items = group.items.filter((it) => {
        const keysText = it.keys.join(" ").toLowerCase();
        return (
          it.description.toLowerCase().includes(q) ||
          keysText.includes(q)
        );
      });

      return {
        ...group,
        items,
        count: items.length,
      };
    }).filter((g) => g.count > 0);
  }, [q]);

  const totalResults = filtered.reduce((s, g) => s + g.count, 0);

  return (
    <section className="rounded-xl border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Navigate faster, manage chats and calls, and control the app using keyboard shortcuts.
          </p>
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {totalResults} result{totalResults !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shortcuts (e.g. call, chat, Ctrl + K)"
          className="pl-9"
        />
      </div>

      {/* Empty State */}
      {totalResults === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No shortcuts found. Try different keywords.
        </div>
      ) : (
        /* Shortcuts Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((group) => (
            <div key={group.group} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group.group}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {group.count}
                </span>
              </div>

              <ul className="space-y-2">
                {group.items.map((item, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      "flex items-center justify-between gap-4",
                      "rounded-md px-3 py-2 transition",
                      "hover:bg-muted/10"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm">
                        <Highlight text={item.description} query={q} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((key, i) => (
                        <kbd
                          key={i}
                          className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-muted border text-[11px] font-medium"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Footer Hint */}
      <div className="pt-2 text-xs text-muted-foreground">
        Tip: Press{" "}
        <kbd className="px-2 py-0.5 rounded bg-muted border">Ctrl</kbd>{" "}
        (or{" "}
        <kbd className="px-2 py-0.5 rounded bg-muted border">Cmd</kbd>{" "}
        on macOS) +{" "}
        <kbd className="px-2 py-0.5 rounded bg-muted border">/</kbd>{" "}
        anytime to open the full shortcuts overlay.
      </div>
    </section>
  );
}

/* ---------- Highlight helper ---------- */
function Highlight({ text = "", query = "" }) {
  if (!query) return <span>{text}</span>;

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc(query)})`, "ig"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-primary/20 text-primary px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

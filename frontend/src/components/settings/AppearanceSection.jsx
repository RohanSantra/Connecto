"use client";

import React, { useMemo, useState } from "react";
import { Search, Sun, Moon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useThemeStore } from "@/store/useThemeStore";
import THEMES from "@/styles/themeConstant";

export default function AppearanceSection() {
  /* light / dark from next-themes */
  const { theme: mode, setTheme: setMode } = useTheme();

  /* variant from Zustand */
  const { theme, setTheme } = useThemeStore();

  const [query, setQuery] = useState("");

  /* --------------------------------
     Filter themes
  -------------------------------- */
  const filteredThemes = useMemo(() => {
    return THEMES.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  /* --------------------------------
     Helper: preview colors
  -------------------------------- */
  const getPreviewColors = (t) =>
    t.preview[mode === "dark" ? "dark" : "light"];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize theme colors and display mode
        </p>
      </div>

      {/* MODE TOGGLE */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div>
          <div className="font-medium">Display mode</div>
          <div className="text-sm text-muted-foreground">
            Choose light or dark appearance
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={mode === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("light")}
          >
            <Sun className="w-4 h-4 mr-2" />
            Light
          </Button>

          <Button
            variant={mode === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("dark")}
          >
            <Moon className="w-4 h-4 mr-2" />
            Dark
          </Button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search themes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* THEMES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredThemes.map((t) => {
          const active = t.key === theme;
          const previewColors = getPreviewColors(t);

          return (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={cn(
                "rounded-xl border bg-card p-4 text-left transition",
                "hover:border-foreground/40",
                active && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{t.name}</div>
                {active && <Check className="w-4 h-4 text-primary" />}
              </div>

              <div className="flex gap-2">
                {previewColors.slice(0, 6).map((c, i) => (
                  <span
                    key={i}
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

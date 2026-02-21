"use client";

import React, { useMemo, useState } from "react";
import { Sun, Moon, Palette } from "lucide-react";

import THEMES from "@/styles/themeConstant";
import { useTheme } from "next-themes";
import { useThemeStore } from "@/store/useThemeStore";
import { Button } from "@/components/ui/button";

import ThemeFilters from "./ThemeFilters";
import ThemeCard from "./ThemeCard";

export default function AppearanceSection() {
  const { theme: mode, setTheme: setMode } = useTheme(); // light/dark
  const { theme, setTheme } = useThemeStore(); // color theme key

  const [query, setQuery] = useState("");
  const [tone, setTone] = useState("all");
  const [intensity, setIntensity] = useState("all");
  const [tag, setTag] = useState("all");

  /* ---------------- FILTER ENGINE ---------------- */
  const filteredThemes = useMemo(() => {
    return THEMES.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.tags.some((tag) =>
          tag.toLowerCase().includes(query.toLowerCase())
        );

      const matchesTone = tone === "all" || t.tone === tone;
      const matchesIntensity =
        intensity === "all" || t.intensity === intensity;
      const matchesTag = tag === "all" || t.tags.includes(tag);

      return matchesSearch && matchesTone && matchesIntensity && matchesTag;
    });
  }, [query, tone, intensity, tag]);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Appearance Studio
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Personalize the visual identity of your chat experience
        </p>
      </div>

      {/* MODE TOGGLE */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border bg-card">
        <div>
          <p className="font-medium">Display Mode</p>
          <p className="text-sm text-muted-foreground">
            Switch global brightness
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "light" ? "default" : "outline"}
            onClick={() => setMode("light")}
          >
            <Sun className="w-4 h-4 mr-2" /> Light
          </Button>

          <Button
            size="sm"
            variant={mode === "dark" ? "default" : "outline"}
            onClick={() => setMode("dark")}

          >
            <Moon className="w-4 h-4 mr-2" /> Dark
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <ThemeFilters
        query={query}
        setQuery={setQuery}
        tone={tone}
        setTone={setTone}
        intensity={intensity}
        setIntensity={setIntensity}
        tag={tag}
        setTag={setTag}
      />

      {/* THEMES GRID */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredThemes.map((t) => (
          <ThemeCard
            key={t.key}
            themeData={t}
            active={theme === t.key}
            mode={mode}
            onSelect={() => setTheme(t.key)}
          />
        ))}
      </div>
    </div>
  );
}

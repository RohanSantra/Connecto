"use client"

import { useMemo, useState } from "react"
import { Search, Sparkles, SlidersHorizontal, Tag, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import THEMES from "@/styles/themeConstant"

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command"

export default function ThemeFilters({
  query, setQuery,
  tone, setTone,
  intensity, setIntensity,
  tag, setTag
}) {
  const allTags = useMemo(() =>
    Array.from(new Set(THEMES.flatMap(t => t.tags))).sort(),
    []
  )

  const tones = ["all", "warm", "cool", "neutral", "nature", "soft", "vibrant", "bold"]
  const intensities = ["all", "low", "soft", "medium", "bold", "high"]

  const [tagOpen, setTagOpen] = useState(false)

  const clearFilter = (type) => {
    if (type === "tone") setTone("all")
    if (type === "intensity") setIntensity("all")
    if (type === "tag") setTag("all")
  }

  return (
    <div className="space-y-3">

      {/* MAIN CONTROL BAR */}
      <div className="flex flex-wrap items-center gap-2">

        {/* SEARCH */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* TONE SELECT */}
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger className="w-[140px]">
            <Sparkles className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Tone" />
          </SelectTrigger>
          <SelectContent>
            {tones.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* INTENSITY SELECT */}
        <Select value={intensity} onValueChange={setIntensity}>
          <SelectTrigger className="w-[140px]">
            <SlidersHorizontal className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Intensity" />
          </SelectTrigger>
          <SelectContent>
            {intensities.map(i => (
              <SelectItem key={i} value={i}>{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* TAG SELECT (Searchable) */}
        <Popover open={tagOpen} onOpenChange={setTagOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px] justify-start">
              <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
              {tag === "all" ? "Vibes" : tag}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64">
            <Command>
              <CommandInput placeholder="Search vibes..." />
              <CommandEmpty>No vibe found</CommandEmpty>
              <CommandList className="scroll-thumb-only">
                <CommandItem onSelect={() => { setTag("all"); setTagOpen(false) }}>
                  all
                </CommandItem>
                {allTags.map(t => (
                  <CommandItem
                    key={t}
                    onSelect={() => {
                      setTag(t)
                      setTagOpen(false)
                    }}
                  >
                    {t}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      <div className="flex flex-wrap gap-2">
        {tone !== "all" && <Chip label={`Tone: ${tone}`} onClear={() => clearFilter("tone")} />}
        {intensity !== "all" && <Chip label={`Intensity: ${intensity}`} onClear={() => clearFilter("intensity")} />}
        {tag !== "all" && <Chip label={`Vibe: ${tag}`} onClear={() => clearFilter("tag")} />}
      </div>
    </div>
  )
}

function Chip({ label, onClear }) {
  return (
    <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
      {label}
      <button onClick={onClear}>
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

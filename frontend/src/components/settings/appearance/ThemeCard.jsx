import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ThemeCard({ themeData, active, mode, onSelect }) {
  const colors = themeData.preview[mode === "dark" ? "dark" : "light"]

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative p-5 rounded-2xl border bg-card text-left transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        active && "ring-2 ring-primary shadow-lg"
      )}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-sm leading-tight">
            {themeData.name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {themeData.tone} • {themeData.intensity}
          </p>
        </div>

        {active && (
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
        )}
      </div>

      {/* COLOR PREVIEW STRIP */}
      <div className="h-10 w-full rounded-lg overflow-hidden flex mb-3 border">
        {colors.map((c, i) => (
          <div
            key={i}
            className="flex-1 transition-all group-hover:flex-[1.2]"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* TAGS */}
      <div className="flex flex-wrap gap-1.5">
        {themeData.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

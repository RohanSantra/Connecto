"use client";

export default function CallHistorySkeleton({
  groupCount = 2,
  itemsPerGroup = 3,
}) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: groupCount }).map((_, gi) => (
        <section
          key={gi}
          className="px-4 py-4 border-b last:border-b-0 space-y-4"
        >
          {/* ===== Date Header ===== */}
          <div className="flex items-center gap-3">
            <div className="h-6 w-24 bg-muted rounded-full" />
            <div className="h-3 w-14 bg-muted rounded" />
          </div>

          {/* ===== Call Items ===== */}
          <div className="space-y-3">
            {Array.from({ length: itemsPerGroup }).map((_, ii) => (
              <div
                key={ii}
                className="flex gap-3 p-3 rounded-xl border"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  
                  {/* Top Section (Responsive like real UI) */}
                  <div className="flex flex-col gap-2">
                    
                    {/* Left text block */}
                    <div className="space-y-1 min-w-0">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>

                    {/* Right time block */}
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <div className="h-3 w-12 bg-muted rounded" />
                      <div className="h-3 w-20 bg-muted rounded" />
                    </div>
                  </div>

                  {/* Duration line */}
                  <div className="h-3 w-5/6 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

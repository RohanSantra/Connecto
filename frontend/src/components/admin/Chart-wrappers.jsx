// src/components/admin/chart-wrappers.jsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { format, parseISO, isValid as isValidDate } from "date-fns";

/* ===========================
   Helpers & responsive hook
   =========================== */

const DEFAULT_PALETTE = [
  "var(--chart-1, #6366f1)",
  "var(--chart-2, #06b6d4)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #ef4444)",
  "var(--chart-5, #10b981)",
];

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatNumber(n) {
  if (n == null || isNaN(Number(n))) return "-";
  // compact for large numbers
  const num = Number(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat().format(num);
}

function tryFormatDateLabel(v) {
  if (!v && v !== 0) return "";
  // handle 'YYYY-MM-DD' or ISO
  try {
    const d = typeof v === "string" && v.length >= 8 ? parseISO(v) : new Date(v);
    if (isValidDate(d)) return format(d, "MMM d");
  } catch { }
  // fallback
  return String(v).slice(0, 12);
}

/* hook: responsive height by breakpoint */
function useResponsiveHeight(defaults = { sm: 220, md: 320, lg: 420 }) {
  const [height, setHeight] = useState(defaults.md);

  useEffect(() => {
    function calc() {
      const w = window.innerWidth;
      if (w < 640) setHeight(defaults.sm);
      else if (w < 1024) setHeight(defaults.md);
      else setHeight(defaults.lg);
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [defaults.sm, defaults.md, defaults.lg]);

  return height;
}

/* ===========================
   Custom Tooltip
   =========================== */

function ChartTooltip({ active, payload, label, xFormatter, yFormatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white/95 border rounded-md p-2 text-sm shadow-md">
      <div className="text-xs text-muted-foreground mb-1">{xFormatter ? xFormatter(label) : tryFormatDateLabel(label)}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, background: p.color, display: "inline-block", borderRadius: 2 }} />
          <div className="flex-1">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-muted-foreground">{yFormatter ? yFormatter(p.value) : formatNumber(p.value)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===========================
   Small Legend / Index
   - shows color swatch, name, value, optional percentage
   =========================== */

export function ChartIndex({ series = [], data = [], dataKey = null, total = null }) {
  // series: [{ key, name }]
  const safe = safeArray(series);
  const computedTotal = total ?? (dataKey && data ? data.reduce((s, r) => s + Number(r[dataKey] || 0), 0) : null);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {safe.map((s, i) => {
        // last-known value for the series (from data end)
        const last = Array.isArray(data) && data.length ? data[data.length - 1][s.key] ?? 0 : 0;
        const pct = computedTotal ? ((Number(last) / computedTotal) * 100).toFixed(1) : null;

        return (
          <div key={s.key} className="flex items-center gap-3 bg-muted/40 rounded-md px-3 py-2">
            <div style={{ width: 12, height: 12, background: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length], borderRadius: 3 }} />
            <div className="text-sm">
              <div className="font-medium leading-none">{s.name || s.key}</div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(last)}{pct ? ` • ${pct}%` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===========================
   AreaWrapper
   =========================== */

export function AreaWrapper({
  title,
  data = [],
  series = [{ key: "value", name: "Value" }],
  xKey = "_id",
  height: overrideHeight = null,
  showLegend = true,
  xFormatter = null,
  yFormatter = null,
  colors = DEFAULT_PALETTE,
}) {
  const safeData = safeArray(data);
  const height = overrideHeight ?? useResponsiveHeight();

  if (!safeData.length) {
    return (
      <div className="bg-card rounded-lg p-6">
        {title && <div className="font-semibold mb-2">{title}</div>}
        <div className="text-sm text-muted-foreground">No data available for selected range.</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4">
      {title && <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">Showing trend over time</div>
        </div>
        {showLegend && <ChartIndex series={series} data={safeData} dataKey={series[0]?.key} />}
      </div>}

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <AreaChart data={safeData}>
            <defs>
              {series.map((s, i) => (
                <linearGradient id={`grad-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.06} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 6" vertical={false} strokeOpacity={0.08} />
            <XAxis
              dataKey={xKey}
              tickFormatter={(v) => (xFormatter ? xFormatter(v) : tryFormatDateLabel(v))}
              minTickGap={20}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={(v) => (yFormatter ? yFormatter(v) : formatNumber(v))} width={70} />

            <Tooltip content={<ChartTooltip xFormatter={xFormatter} yFormatter={yFormatter} />} />

            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={colors[i % colors.length]}
                fill={`url(#grad-${s.key})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===========================
   LineWrapper
   =========================== */

export function LineWrapper({
  title,
  data = [],
  series = [{ key: "value", name: "Value" }],
  xKey = "_id",
  height: overrideHeight = null,
  showLegend = true,
  xFormatter = null,
  yFormatter = null,
  colors = DEFAULT_PALETTE,
}) {
  const safeData = safeArray(data);
  const height = overrideHeight ?? useResponsiveHeight();

  if (!safeData.length) {
    return (
      <div className="bg-card rounded-lg p-6">
        {title && <div className="font-semibold mb-2">{title}</div>}
        <div className="text-sm text-muted-foreground">No data available for selected range.</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4">
      {title && <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">Trend across the selected dates</div>
        </div>
        {showLegend && <ChartIndex series={series} data={safeData} dataKey={series[0]?.key} />}
      </div>}

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart data={safeData}>
            <CartesianGrid strokeDasharray="3 6" vertical={false} strokeOpacity={0.08} />
            <XAxis
              dataKey={xKey}
              tickFormatter={(v) => (xFormatter ? xFormatter(v) : tryFormatDateLabel(v))}
              minTickGap={20}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={(v) => (yFormatter ? yFormatter(v) : formatNumber(v))} width={70} />
            <Tooltip content={<ChartTooltip xFormatter={xFormatter} yFormatter={yFormatter} />} />

            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}

            <Legend verticalAlign="top" align="right" height={36} payload={series.map((s, i) => ({ id: s.key, value: s.name || s.key, type: "line", color: colors[i % colors.length] }))} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===========================
   PieWrapper
   =========================== */

export function PieWrapper({
  title,
  data = [],
  dataKey = "value",
  nameKey = "name",
  height: overrideHeight = null,
  showLegend = true,
  colors = DEFAULT_PALETTE,
  innerRadius = 50,
  outerRadius = 90,
}) {
  const safeData = safeArray(data).filter((d) => Number(d?.[dataKey] ?? 0) > 0);
  const height = overrideHeight ?? useResponsiveHeight({ sm: 300, md: 300, lg: 320 });

  if (!safeData.length) {
    return (
      <div className="bg-card rounded-lg p-6">
        {title && <div className="font-semibold mb-2">{title}</div>}
        <div className="text-sm text-muted-foreground">No slices to display</div>
      </div>
    );
  }

  const total = safeData.reduce((s, r) => s + Number(r[dataKey] || 0), 0);

  return (
    <div className="bg-card rounded-lg p-4">
      {title && <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">Distribution</div>
        </div>
        {showLegend && <div className="text-sm text-muted-foreground">{formatNumber(total)} total</div>}
      </div>}

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip formatter={(v) => formatNumber(v)} />
            <Pie
              data={safeData}
              dataKey={dataKey}
              nameKey={nameKey}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              label={(entry) => `${entry[nameKey]} (${((entry[dataKey] / total) * 100).toFixed(0)}%)`}
              isAnimationActive={false}
            >
              {safeData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={60}
                payload={safeData.map((d, i) => ({
                  id: d[nameKey],
                  value: `${d[nameKey]} — ${formatNumber(d[dataKey])}`,
                  color: colors[i % colors.length],
                }))}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===========================
   Exports summary:
   - AreaWrapper(props)
   - LineWrapper(props)
   - PieWrapper(props)
   - ChartIndex(props)
   =========================== */

export default {
  AreaWrapper,
  LineWrapper,
  PieWrapper,
  ChartIndex,
};

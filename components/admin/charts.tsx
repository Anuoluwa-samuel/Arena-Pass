"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useMediaQuery } from "@/hooks/use-mobile"
import { formatMoney } from "@/lib/format"

/**
 * Chart conventions (see docs/DESIGN.md): one measure per chart, one hue,
 * 2px lines with a 10% wash, thin bars capped at 24px with rounded data
 * ends, hairline grid, crosshair tooltip, text in text tokens.
 */
// Themed in app/globals.css (--chart-mark/grid/axis/cursor). SVG presentation
// attributes resolve var() like any CSS value, so marks re-colour on theme
// change with no re-render. Each theme's mark is tuned to ≥ 5:1 on its surface.
const MARK = "var(--chart-mark)"
const GRID = "var(--chart-grid)"
const AXIS = "var(--chart-axis)"

function dayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" })
}

function TooltipBox({ label, rows }: { label: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {rows.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-4 text-muted-foreground"><span>{k}</span><span className="tabular-nums text-foreground">{v}</span></p>
      ))}
    </div>
  )
}

export function TimeSeriesChart({ data, metric, currency, height = 220 }: { data: Array<{ date: string; tickets: number; revenue: number }>; metric: "tickets" | "revenue"; currency: string; height?: number }) {
  const fmt = (v: number) => (metric === "revenue" ? formatMoney(v, currency) : String(v))
  return (
    <div style={{ height }} role="img" aria-label={`${metric === "revenue" ? "Revenue" : "Tickets sold"} over time`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`wash-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MARK} stopOpacity={0.18} />
              <stop offset="100%" stopColor={MARK} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={metric === "revenue" ? 64 : 32} tickFormatter={(v: number) => (metric === "revenue" ? `${Math.round(v / 100 / 1000)}k` : String(v))} allowDecimals={false} />
          <Tooltip cursor={{ stroke: AXIS, strokeWidth: 1 }} content={({ active, payload, label }) => (active && payload?.length ? <TooltipBox label={dayLabel(String(label))} rows={[[metric === "revenue" ? "Revenue" : "Tickets", fmt(Number(payload[0].value))]]} /> : null)} />
          <Area type="monotone" dataKey={metric} stroke={MARK} strokeWidth={2} fill={`url(#wash-${metric})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card-solid)", fill: MARK }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Rows may carry a `display` string (e.g. "21/32") used for the value label and tooltip. */
export function HorizontalBars({ data, valueKey, labelKey, height, max }: { data: Array<Record<string, unknown> & { display?: string }>; valueKey: string; labelKey: string; height?: number; max?: number }) {
  const display = (row: Record<string, unknown> & { display?: string }) => row.display ?? String(row[valueKey])
  const phone = useMediaQuery("(max-width: 639px)")
  if (phone) return <StackedBars data={data} valueKey={valueKey} labelKey={labelKey} max={max} display={display} />
  const h = height ?? Math.max(120, data.length * 36 + 16)
  return (
    <div style={{ height: h }} role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={12}>
          <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
          <XAxis type="number" hide domain={[0, max ?? "auto"]} />
          <YAxis type="category" dataKey={labelKey} width={170} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 24 ? v.slice(0, 23) + "…" : v)} />
          <Tooltip cursor={{ fill: "var(--chart-cursor)" }} content={({ active, payload }) => (active && payload?.length ? <TooltipBox label={String(payload[0].payload[labelKey])} rows={[["Value", display(payload[0].payload)]]} /> : null)} />
          <Bar dataKey={valueKey} maxBarSize={20} radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={MARK} />
            ))}
            <LabelList dataKey="display" position="right" fill={AXIS} fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Phone layout for HorizontalBars: a fixed label column leaves no room for bars, so each label sits above its bar. */
function StackedBars({ data, valueKey, labelKey, max, display }: { data: Array<Record<string, unknown> & { display?: string }>; valueKey: string; labelKey: string; max?: number; display: (row: Record<string, unknown> & { display?: string }) => string }) {
  const top = max ?? Math.max(1, ...data.map((row) => Number(row[valueKey]) || 0))
  return (
    <ul className="space-y-3" aria-label="Bar chart">
      {data.map((row, i) => {
        const pct = top > 0 ? Math.min(100, ((Number(row[valueKey]) || 0) / top) * 100) : 0
        return (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-foreground">{String(row[labelKey])}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{display(row)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: MARK }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Ratio against a limit: a meter, not a two-slice pie. */
export function Meter({ value, max, label, sub }: { value: number; max: number; label: string; sub?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: MARK }} />
      </div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

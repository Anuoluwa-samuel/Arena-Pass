/** Formatting helpers shared by server and client rendering. */

export function formatMoney(minorUnits: number, currency = "NGN", locale = "en-NG") {
  const amount = minorUnits / 100
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatDate(value: Date | string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }, timeZone?: string) {
  const d = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat("en-NG", { ...opts, timeZone }).format(d)
}

export function formatShortDate(value: Date | string, timeZone?: string) {
  return formatDate(value, { weekday: "short", month: "short", day: "numeric" }, timeZone)
}

export function formatTime(value: Date | string, timeZone?: string) {
  const d = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", timeZone }).format(d)
}

export function formatDateTime(value: Date | string, timeZone?: string) {
  return `${formatShortDate(value, timeZone)}, ${formatTime(value, timeZone)}`
}

export function formatTimeRange(start: Date | string, end: Date | string, timeZone?: string) {
  return `${formatTime(start, timeZone)} – ${formatTime(end, timeZone)}`
}

export function formatRelative(value: Date | string, now: Date = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  const diff = d.getTime() - now.getTime()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const minutes = Math.round(diff / 60_000)
  if (abs < 60_000) return "just now"
  if (abs < 3_600_000) return rtf.format(minutes, "minute")
  if (abs < 86_400_000) return rtf.format(Math.round(minutes / 60), "hour")
  return rtf.format(Math.round(minutes / 1440), "day")
}

export function toDatetimeLocalValue(value: Date | string | null | undefined) {
  if (!value) return ""
  const d = value instanceof Date ? value : new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

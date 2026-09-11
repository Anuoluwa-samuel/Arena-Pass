/**
 * Structured JSON logger. In production every line is a single JSON object
 * so it can be ingested by any log pipeline; in development it is pretty.
 * Keep it dependency-free — it is imported by nearly every server module.
 */
type Level = "debug" | "info" | "warn" | "error"
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const configured = (process.env.LOG_LEVEL as Level) || "info"
const isProd = process.env.NODE_ENV === "production"

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  if (order[level] < order[configured]) return
  const entry = { ts: new Date().toISOString(), level, event, ...fields }
  const line = isProd ? JSON.stringify(entry) : `[${level}] ${event} ${fields ? JSON.stringify(fields) : ""}`
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
}

export function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: isProd ? undefined : err.stack }
  }
  return { message: String(err) }
}

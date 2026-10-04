import { getClientIp } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { logger } from "@/server/observability/logger"

/** Browsers send reports bigger than this only when something is wrong (or someone is padding them). */
const MAX_REPORT_BYTES = 8 * 1024

type Violation = Record<string, unknown>

/**
 * Collects Content-Security-Policy violations (see proxy.ts) into the server
 * log as `csp.violation`, which is how we learn what an enforcing policy would
 * break. Accepts the legacy `report-uri` body ({"csp-report": {...}}) and the
 * Reporting API's array of {type, body}. Always answers 204: browsers ignore
 * the response, and an error would only invite retries.
 */
export async function POST(req: Request) {
  try {
    await enforceRateLimit(RATE_LIMITS.publicRead, `csp:${getClientIp(req)}`)
    const raw = await req.text()
    if (raw.length > MAX_REPORT_BYTES) return new Response(null, { status: 204 })
    const parsed: unknown = JSON.parse(raw)
    const reports: Violation[] = Array.isArray(parsed)
      ? parsed.map((r) => (r as { body?: Violation }).body ?? {})
      : [((parsed as { "csp-report"?: Violation })["csp-report"] ?? {})]
    for (const r of reports.slice(0, 10)) {
      logger.warn("csp.violation", {
        directive: r["effective-directive"] ?? r.effectiveDirective ?? r["violated-directive"],
        blocked: r["blocked-uri"] ?? r.blockedURL,
        page: r["document-uri"] ?? r.documentURL,
        source: r["source-file"] ?? r.sourceFile,
        line: r["line-number"] ?? r.lineNumber,
        sample: r["script-sample"] ?? r.sample,
      })
    }
  } catch {
    // Rate limited or malformed: drop it quietly.
  }
  return new Response(null, { status: 204 })
}

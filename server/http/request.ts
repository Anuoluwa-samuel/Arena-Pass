import { z } from "zod"
import { AppError } from "./errors"

export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON")
  }
  return schema.parse(body)
}

export function parseQuery<T extends z.ZodTypeAny>(req: Request, schema: T): z.infer<T> {
  const url = new URL(req.url)
  const obj: Record<string, string | string[]> = {}
  for (const [k, v] of url.searchParams.entries()) {
    if (k in obj) obj[k] = ([] as string[]).concat(obj[k], v)
    else obj[k] = v
  }
  return schema.parse(obj)
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type Pagination = z.infer<typeof paginationSchema>

export function paginate<T>(items: T[], total: number, { page, pageSize }: Pagination) {
  return { items, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

/**
 * CSRF defence for cookie-authenticated mutations: the browser always sends
 * Origin on cross-site POST/PUT/PATCH/DELETE, so a mismatch means a foreign
 * page is trying to ride the user's cookies. Same-origin fetches from our own
 * pages carry a matching Origin (or, for some clients, none at all).
 */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return
  const origin = req.headers.get("origin")
  if (!origin) return
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!host) return
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new AppError("FORBIDDEN", "Invalid request origin")
  }
  if (originHost !== host) throw new AppError("FORBIDDEN", "Cross-origin request rejected")
}

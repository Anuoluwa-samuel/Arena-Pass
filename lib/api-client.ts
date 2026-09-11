/**
 * Thin fetch wrapper for client components. Every response follows the
 * `{ success, data, message, code }` envelope; failures throw ApiError so
 * callers can switch on `code` (e.g. SESSION_FULL) and show `message`.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface ApiMeta {
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
  [key: string]: unknown
}

async function request<T>(method: string, url: string, body?: unknown, init?: RequestInit): Promise<{ data: T; message?: string; meta?: ApiMeta }> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: isForm ? undefined : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    ...init,
  })
  let json: { success: boolean; data?: T; message?: string; code?: string; details?: unknown; meta?: ApiMeta } | null = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  if (!res.ok || !json || !json.success) {
    throw new ApiError(json?.code ?? "INTERNAL_ERROR", json?.message ?? "Something went wrong. Please try again.", res.status, json?.details)
  }
  return { data: json.data as T, message: json.message, meta: json.meta }
}

export const api = {
  get: <T>(url: string, init?: RequestInit) => request<T>("GET", url, undefined, init),
  post: <T>(url: string, body?: unknown, init?: RequestInit) => request<T>("POST", url, body, init),
  put: <T>(url: string, body?: unknown, init?: RequestInit) => request<T>("PUT", url, body, init),
  patch: <T>(url: string, body?: unknown, init?: RequestInit) => request<T>("PATCH", url, body, init),
  delete: <T>(url: string, init?: RequestInit) => request<T>("DELETE", url, undefined, init),
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message || fallback
  return fallback
}

/** Field-level messages from a VALIDATION_ERROR response. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return {}
  const out: Record<string, string> = {}
  for (const d of err.details as Array<{ path: string; message: string }>) if (d.path && !out[d.path]) out[d.path] = d.message
  return out
}

import { z } from "zod"
import { ok } from "@/server/http/response"
import { parseQuery, paginationSchema } from "@/server/http/request"
import { adminRoute } from "@/server/http/admin"
import { listAuditLogs } from "@/server/services/analytics"

export const GET = adminRoute("audit.view", async (req) => {
  const q = parseQuery(req, paginationSchema.extend({ q: z.string().max(100).optional(), action: z.string().max(60).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }))
  const result = await listAuditLogs(q)
  return ok(result.items, { meta: result.meta })
})

import { ok } from "@/server/http/response"
import { parseQuery, paginationSchema } from "@/server/http/request"
import { adminRoute } from "@/server/http/admin"
import { listTransactions } from "@/server/services/payments"

export const GET = adminRoute("payments.view", async (req) => {
  const result = await listTransactions(parseQuery(req, paginationSchema))
  return ok(result.items, { meta: result.meta })
})

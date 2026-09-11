import { z } from "zod"
import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { getCustomerDetail, updateCustomer } from "@/server/services/customers"
import { recordAudit } from "@/server/services/audit"

export const GET = adminRoute("customers.view", async (_req, { params }) => {
  const { id } = await params
  return ok(await getCustomerDetail(id))
})

export const PATCH = adminRoute("customers.manage", async (req, { params }, user) => {
  const { id } = await params
  const patch = await parseJson(req, z.object({ name: z.string().trim().min(2).max(80).optional(), phone: z.string().trim().max(30).nullable().optional(), isActive: z.boolean().optional() }))
  const row = await updateCustomer(id, patch)
  await recordAudit(actorFrom(user, req), { action: "customer.update", entityType: "customer", entityId: id, description: `Updated customer ${row.name}` })
  return ok(row, { message: "Customer updated" })
})

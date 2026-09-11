import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { updateService, deleteService, serviceInputSchema } from "@/server/services/cms"

export const PATCH = adminRoute("cms.manage", async (req, { params }, user) => {
  const { id } = await params
  const input = await parseJson(req, serviceInputSchema.partial())
  return ok(await updateService(id, input, { actor: actorFrom(user, req) }), { message: "Updated" })
})

export const DELETE = adminRoute("cms.manage", async (req, { params }, user) => {
  const { id } = await params
  await deleteService(id, { actor: actorFrom(user, req) })
  return ok(null, { message: "Deleted" })
})

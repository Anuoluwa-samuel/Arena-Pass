import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { updateBanner, deleteBanner, bannerInputSchema } from "@/server/services/cms"

export const PATCH = adminRoute("cms.manage", async (req, { params }, user) => {
  const { id } = await params
  const input = await parseJson(req, bannerInputSchema.partial())
  return ok(await updateBanner(id, input, { actor: actorFrom(user, req) }), { message: "Updated" })
})

export const DELETE = adminRoute("cms.manage", async (req, { params }, user) => {
  const { id } = await params
  await deleteBanner(id, { actor: actorFrom(user, req) })
  return ok(null, { message: "Deleted" })
})

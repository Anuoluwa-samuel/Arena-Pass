import { z } from "zod"
import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom, resolveArenaId } from "@/server/http/admin"
import { reorder } from "@/server/services/cms"

export const POST = adminRoute("cms.manage", async (req, _ctx, user) => {
  const { ids } = await parseJson(req, z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }))
  await reorder("cms_services", ids, { actor: actorFrom(user, req), arenaId: await resolveArenaId(user) })
  return ok(null, { message: "Order saved" })
})

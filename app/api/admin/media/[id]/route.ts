import { z } from "zod"
import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { deleteMedia, updateMedia } from "@/server/services/media"

export const PATCH = adminRoute("media.manage", async (req, { params }, user) => {
  const { id } = await params
  const patch = await parseJson(req, z.object({ altText: z.string().max(200).optional(), folder: z.string().max(40).optional() }))
  return ok(await updateMedia(id, patch, { actor: actorFrom(user, req) }), { message: "Updated" })
})

export const DELETE = adminRoute("media.manage", async (req, { params }, user) => {
  const { id } = await params
  await deleteMedia(id, { actor: actorFrom(user, req) })
  return ok(null, { message: "Deleted" })
})

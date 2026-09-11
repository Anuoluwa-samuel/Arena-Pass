import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { updateAnnouncement, deleteAnnouncement, announcementInputSchema } from "@/server/services/cms"

export const PATCH = adminRoute("cms.manage", async (req, { params }, user) => {
  const { id } = await params
  const input = await parseJson(req, announcementInputSchema.partial())
  return ok(await updateAnnouncement(id, input, { actor: actorFrom(user, req) }), { message: "Announcement updated" })
})

export const DELETE = adminRoute("cms.manage", async (req, { params }, user) => {
  const { id } = await params
  await deleteAnnouncement(id, { actor: actorFrom(user, req) })
  return ok(null, { message: "Announcement deleted" })
})

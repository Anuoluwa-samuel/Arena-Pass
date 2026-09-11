import { ok } from "@/server/http/response"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { unpublishSession } from "@/server/services/sessions"

export const POST = adminRoute("sessions.manage", async (req, { params }, user) => {
  const { id } = await params
  return ok(await unpublishSession(id, { actor: actorFrom(user, req) }), { message: "Session unpublished" })
})

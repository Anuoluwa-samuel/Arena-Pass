import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { sessionInputSchema } from "@/lib/validation/sessions"
import { deleteSession, getSessionWithTeams, updateSession } from "@/server/services/sessions"

export const GET = adminRoute("sessions.view", async (_req, { params }) => {
  const { id } = await params
  return ok(await getSessionWithTeams(id, { includeDraft: true }))
})

export const PATCH = adminRoute("sessions.manage", async (req, { params }, user) => {
  const { id } = await params
  const input = await parseJson(req, sessionInputSchema)
  return ok(await updateSession(id, input, { actor: actorFrom(user, req) }), { message: "Session updated" })
})

export const DELETE = adminRoute("sessions.manage", async (req, { params }, user) => {
  const { id } = await params
  await deleteSession(id, { actor: actorFrom(user, req) })
  return ok(null, { message: "Session deleted" })
})

import { ok } from "@/server/http/response"
import { parseJson, parseQuery } from "@/server/http/request"
import { adminRoute, actorFrom, resolveArenaId } from "@/server/http/admin"
import { sessionInputSchema, sessionListQuerySchema } from "@/lib/validation/sessions"
import { createSession, listSessions, syncSessionLifecycle } from "@/server/services/sessions"

export const GET = adminRoute("sessions.view", async (req, _ctx, user) => {
  const q = parseQuery(req, sessionListQuerySchema)
  await syncSessionLifecycle()
  const result = await listSessions({ arenaId: user.arenaId ?? undefined, status: q.status, from: q.from, to: q.to, q: q.q, page: q.page, pageSize: q.pageSize, order: q.status === "completed" ? "desc" : "asc" })
  return ok(result.items, { meta: result.meta })
})

export const POST = adminRoute("sessions.manage", async (req, _ctx, user) => {
  const input = await parseJson(req, sessionInputSchema)
  const session = await createSession(input, { arenaId: await resolveArenaId(user), actor: actorFrom(user, req) })
  return ok(session, { status: 201, message: "Session created" })
})

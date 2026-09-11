import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp } from "@/server/http/request"
import { getCurrentUser } from "@/server/auth/session"
import { logoutUser } from "@/server/auth/service"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const user = await getCurrentUser()
  if (user) await logoutUser(user.sessionId, { id: user.id, name: user.name, arenaId: user.arenaId, ip: getClientIp(req) })
  return ok(null, { message: "Signed out" })
})

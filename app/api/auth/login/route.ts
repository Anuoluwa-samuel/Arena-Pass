import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { loginSchema } from "@/lib/validation/auth"
import { loginUser } from "@/server/auth/service"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const ip = getClientIp(req)
  await enforceRateLimit(RATE_LIMITS.login, ip)
  const body = await parseJson(req, loginSchema)
  await enforceRateLimit(RATE_LIMITS.login, `email:${body.email.toLowerCase()}`)
  const user = await loginUser(body.email, body.password, { ip, userAgent: req.headers.get("user-agent") })
  return ok(user, { message: "Signed in" })
})

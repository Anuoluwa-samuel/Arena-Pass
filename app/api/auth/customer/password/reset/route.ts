import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { resetPasswordSchema } from "@/lib/validation/auth"
import { resetPassword } from "@/server/auth/password-reset"
import { createAuthSession, setSessionCookie } from "@/server/auth/session"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const ip = getClientIp(req)
  await enforceRateLimit(RATE_LIMITS.passwordResetSubmit, ip)
  const body = await parseJson(req, resetPasswordSchema)
  const meta = { ip, userAgent: req.headers.get("user-agent") }
  const customer = await resetPassword(body.token, body.password, meta)
  // resetPassword revoked every session; this is the one fresh session for the person who just proved email ownership.
  const { token, ttl } = await createAuthSession("customer", customer.id, meta)
  await setSessionCookie("customer", token, ttl)
  return ok({ id: customer.id, name: customer.name, email: customer.email }, { message: "Password updated" })
})

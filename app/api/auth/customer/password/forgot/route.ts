import { after } from "next/server"
import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { forgotPasswordSchema } from "@/lib/validation/auth"
import { requestPasswordReset } from "@/server/auth/password-reset"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const ip = getClientIp(req)
  await enforceRateLimit(RATE_LIMITS.passwordResetRequest, ip)
  const body = await parseJson(req, forgotPasswordSchema)
  await enforceRateLimit(RATE_LIMITS.passwordResetRequest, `email:${body.email.toLowerCase()}`)
  const deliver = await requestPasswordReset(body.email, { ip, userAgent: req.headers.get("user-agent") })
  // Token issue + email happen after the response, so known and unknown emails respond identically.
  if (deliver) after(deliver)
  return ok(null, { message: "If an account exists for that email, we've sent a reset link." })
})

import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { twoFactorCodeSchema } from "@/lib/validation/auth"
import { confirmTwoFactorEnrolment } from "@/server/auth/two-factor"
import { requirePrincipal } from "@/server/auth/principal"

/** Step two: a correct code switches 2FA on and returns the recovery codes once. */
export const POST = route(async (req) => {
  assertSameOrigin(req)
  await enforceRateLimit(RATE_LIMITS.twoFactor, getClientIp(req))
  const { principalType, id } = await requirePrincipal()
  const body = await parseJson(req, twoFactorCodeSchema)
  const { recoveryCodes } = await confirmTwoFactorEnrolment(principalType, id, body.code)
  return ok({ recoveryCodes }, { message: "Two-factor authentication is on" })
})

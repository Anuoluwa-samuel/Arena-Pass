import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { twoFactorCodeSchema } from "@/lib/validation/auth"
import { disableTwoFactor, isTwoFactorEnabled } from "@/server/auth/two-factor"
import { verifyCurrentPrincipalCode } from "@/server/auth/principal"
import { requirePrincipal } from "@/server/auth/principal"
import { AppError } from "@/server/http/errors"

/**
 * Turning 2FA off needs a current code. Otherwise anyone who walks up to an
 * unlocked, already-signed-in session could quietly remove the second factor.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req)
  await enforceRateLimit(RATE_LIMITS.twoFactor, getClientIp(req))
  const { principalType, id } = await requirePrincipal()
  if (!(await isTwoFactorEnabled(principalType, id))) {
    throw new AppError("CONFLICT", "Two-factor authentication is not on for this account")
  }
  const body = await parseJson(req, twoFactorCodeSchema)
  await verifyCurrentPrincipalCode(principalType, id, body.code)
  await disableTwoFactor(principalType, id)
  return ok(null, { message: "Two-factor authentication is off" })
})

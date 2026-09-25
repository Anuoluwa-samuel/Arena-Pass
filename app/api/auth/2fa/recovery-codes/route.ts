import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { twoFactorCodeSchema } from "@/lib/validation/auth"
import { isTwoFactorEnabled, replaceRecoveryCodes } from "@/server/auth/two-factor"
import { requirePrincipal, verifyCurrentPrincipalCode } from "@/server/auth/principal"
import { AppError } from "@/server/http/errors"

/** Issues a fresh set and retires the old ones. Guarded by a current code, like disabling. */
export const POST = route(async (req) => {
  assertSameOrigin(req)
  await enforceRateLimit(RATE_LIMITS.twoFactor, getClientIp(req))
  const { principalType, id } = await requirePrincipal()
  if (!(await isTwoFactorEnabled(principalType, id))) {
    throw new AppError("CONFLICT", "Two-factor authentication is not on for this account")
  }
  const body = await parseJson(req, twoFactorCodeSchema)
  await verifyCurrentPrincipalCode(principalType, id, body.code)
  return ok({ recoveryCodes: await replaceRecoveryCodes(principalType, id) }, { message: "New recovery codes issued" })
})

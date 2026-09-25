import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { twoFactorCodeSchema } from "@/lib/validation/auth"
import { consumeTwoFactorChallenge } from "@/server/auth/two-factor"
import { clearTwoFactorChallengeCookie, readTwoFactorChallengeCookie } from "@/server/auth/two-factor-cookie"
import { completeCustomerLogin, completeUserLogin } from "@/server/auth/service"
import { z } from "zod"

const schema = twoFactorCodeSchema.extend({
  /** Which sign-in is being finished; the admin and customer flows use separate cookies. */
  scope: z.enum(["admin", "customer"]).default("customer"),
})

/**
 * Second step of sign-in: exchanges a pending challenge plus a valid code for a
 * real session. Rate limited on its own bucket so guessing six digits is not
 * cheap, and the challenge is single-use either way.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req)
  const ip = getClientIp(req)
  await enforceRateLimit(RATE_LIMITS.twoFactor, ip)
  const body = await parseJson(req, schema)
  const principalType = body.scope === "admin" ? "user" : "customer"
  const token = await readTwoFactorChallengeCookie(principalType)
  const { principalId } = await consumeTwoFactorChallenge(principalType, token, body.code)
  await clearTwoFactorChallengeCookie(principalType)
  const meta = { ip, userAgent: req.headers.get("user-agent") }
  if (principalType === "user") {
    const user = await completeUserLogin(principalId, meta)
    return ok(user, { message: "Signed in" })
  }
  const customer = await completeCustomerLogin(principalId, meta)
  return ok({ id: customer.id, name: customer.name, email: customer.email }, { message: "Signed in" })
})

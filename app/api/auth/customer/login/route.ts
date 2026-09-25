import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { loginSchema } from "@/lib/validation/auth"
import { loginCustomer } from "@/server/auth/service"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const ip = getClientIp(req)
  await enforceRateLimit(RATE_LIMITS.login, ip)
  const body = await parseJson(req, loginSchema)
  await enforceRateLimit(RATE_LIMITS.login, `customer:${body.email.toLowerCase()}`)
  const result = await loginCustomer(body.email, body.password, { ip, userAgent: req.headers.get("user-agent") })
  if (result.twoFactorRequired) {
    return ok({ twoFactorRequired: true }, { message: "Enter the code from your authenticator app" })
  }
  const customer = result.customer
  return ok({ id: customer.id, name: customer.name, email: customer.email }, { message: "Signed in" })
})

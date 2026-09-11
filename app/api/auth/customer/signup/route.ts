import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { signupSchema } from "@/lib/validation/auth"
import { signupCustomer } from "@/server/auth/service"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const ip = getClientIp(req)
  await enforceRateLimit(RATE_LIMITS.signup, ip)
  const body = await parseJson(req, signupSchema)
  const customer = await signupCustomer({ ...body, phone: body.phone || undefined }, { ip, userAgent: req.headers.get("user-agent") })
  return ok({ id: customer.id, name: customer.name, email: customer.email }, { message: "Account created", status: 201 })
})

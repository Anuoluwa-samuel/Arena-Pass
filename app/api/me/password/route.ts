import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { requireCustomer } from "@/server/auth/rbac"
import { changePasswordSchema } from "@/lib/validation/profile"
import { changeCustomerPassword } from "@/server/services/profile"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const customer = await requireCustomer()
  // Same budget as sign-in: guessing the current password here must be no easier than at the login form.
  await enforceRateLimit(RATE_LIMITS.login, `customer-password:${customer.id}`)
  const input = await parseJson(req, changePasswordSchema)
  const result = await changeCustomerPassword(customer.id, customer.sessionId, input, { ip: getClientIp(req) })
  return ok(null, { message: result.hadPassword ? "Password changed. Other devices were signed out." : "Password set. You can now also sign in with your email." })
})

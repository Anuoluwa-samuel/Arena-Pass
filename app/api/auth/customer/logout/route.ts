import { route, ok } from "@/server/http/response"
import { assertSameOrigin } from "@/server/http/request"
import { getCurrentCustomer } from "@/server/auth/session"
import { logoutCustomer } from "@/server/auth/service"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const customer = await getCurrentCustomer()
  if (customer) await logoutCustomer(customer.sessionId)
  return ok(null, { message: "Signed out" })
})

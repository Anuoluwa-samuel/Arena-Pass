import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { requireCustomer } from "@/server/auth/rbac"
import { profileSchema } from "@/lib/validation/profile"
import { getCustomerProfile, updateCustomerProfile } from "@/server/services/profile"

const noStore = { "Cache-Control": "private, no-store" }

export const GET = route(async () => {
  const customer = await requireCustomer()
  return ok(await getCustomerProfile(customer.id), { headers: noStore })
})

export const PATCH = route(async (req) => {
  assertSameOrigin(req)
  const customer = await requireCustomer()
  const input = await parseJson(req, profileSchema)
  return ok(await updateCustomerProfile(customer.id, input, { ip: getClientIp(req) }), { message: "Profile saved", headers: noStore })
})

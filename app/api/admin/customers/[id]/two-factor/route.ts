import { ok } from "@/server/http/response"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { resetCustomerTwoFactor } from "@/server/services/customers"

/**
 * Clears a customer's two-factor enrolment. Their last way back in after losing
 * both their authenticator and their recovery codes — confirm who they are
 * before using it.
 */
export const DELETE = adminRoute("customers.manage", async (req, { params }, user) => {
  const { id } = await params
  await resetCustomerTwoFactor(id, { actor: actorFrom(user, req) })
  return ok(null, { message: "Two-factor authentication reset. They can sign in with their password and set it up again." })
})

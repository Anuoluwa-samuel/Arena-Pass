import { ok } from "@/server/http/response"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { resetUserTwoFactor } from "@/server/services/users"

/**
 * Clears an administrator's two-factor enrolment. The last way back in for
 * someone who has lost both their authenticator and their recovery codes.
 * `resetUserTwoFactor` enforces super-admin-only and refuses self-service.
 */
export const DELETE = adminRoute("users.manage", async (req, { params }, user) => {
  const { id } = await params
  await resetUserTwoFactor(id, { actor: actorFrom(user, req), actorRole: user.roleKey })
  return ok(null, { message: "Two-factor authentication reset. They can sign in with their password and set it up again." })
})

import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { deleteUser, updateUser, userInputSchema } from "@/server/services/users"

export const PATCH = adminRoute("users.manage", async (req, { params }, user) => {
  const { id } = await params
  const input = await parseJson(req, userInputSchema.partial())
  return ok(await updateUser(id, input, { actor: actorFrom(user, req), actorRole: user.roleKey }), { message: "Administrator updated" })
})

export const DELETE = adminRoute("users.manage", async (req, { params }, user) => {
  const { id } = await params
  await deleteUser(id, { actor: actorFrom(user, req), actorRole: user.roleKey })
  return ok(null, { message: "Administrator removed" })
})

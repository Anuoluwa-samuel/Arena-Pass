import { z } from "zod"
import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { setRolePermissions } from "@/server/services/users"
import { PERMISSIONS, ROLE_KEYS } from "@/lib/domain/constants"

export const PUT = adminRoute("roles.manage", async (req, { params }, user) => {
  const { key } = await params
  const roleKey = z.enum(ROLE_KEYS).parse(key)
  const { permissions } = await parseJson(req, z.object({ permissions: z.array(z.enum(PERMISSIONS)) }))
  return ok(await setRolePermissions(roleKey, permissions, { actor: actorFrom(user, req) }), { message: "Permissions updated" })
})

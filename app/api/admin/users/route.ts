import { z } from "zod"
import { ok } from "@/server/http/response"
import { parseJson, parseQuery, paginationSchema } from "@/server/http/request"
import { adminRoute, actorFrom } from "@/server/http/admin"
import { createUser, listUsers, userInputSchema } from "@/server/services/users"

export const GET = adminRoute("users.view", async (req) => {
  const q = parseQuery(req, paginationSchema.extend({ q: z.string().max(100).optional(), roleKey: z.string().optional() }))
  const result = await listUsers(q)
  return ok(result.items, { meta: result.meta })
})

export const POST = adminRoute("users.manage", async (req, _ctx, user) => {
  const input = await parseJson(req, userInputSchema)
  return ok(await createUser({ ...input, arenaId: input.arenaId ?? user.arenaId }, { actor: actorFrom(user, req), actorRole: user.roleKey }), { status: 201, message: "Administrator created" })
})

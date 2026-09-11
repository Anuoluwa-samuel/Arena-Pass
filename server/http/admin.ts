import "server-only"
import type { Permission } from "@/lib/domain/constants"
import { requirePermission } from "@/server/auth/rbac"
import type { AuthenticatedUser } from "@/server/auth/session"
import type { AuditActor } from "@/server/services/audit"
import { assertSameOrigin, getClientIp } from "./request"
import { route } from "./response"

export type AdminHandler<Ctx> = (req: Request, ctx: Ctx, user: AuthenticatedUser) => Promise<Response>

/**
 * Every admin endpoint: same-origin check for mutations, then a permission
 * check. The UI may hide buttons, but this is where authorisation happens.
 */
export function adminRoute<Ctx = { params: Promise<Record<string, string>> }>(permission: Permission | Permission[], handler: AdminHandler<Ctx>) {
  const perms = Array.isArray(permission) ? permission : [permission]
  return route<Ctx>(async (req, ctx) => {
    assertSameOrigin(req)
    const user = await requirePermission(...perms)
    return handler(req, ctx, user)
  })
}

export function actorFrom(user: AuthenticatedUser, req: Request): AuditActor & { id: string } {
  return { type: "user", id: user.id, name: user.name, ip: getClientIp(req) }
}

/** Admin users are scoped to an arena; super admins without one act on the default arena. */
export async function resolveArenaId(user: AuthenticatedUser) {
  if (user.arenaId) return user.arenaId
  const { getDefaultArena } = await import("@/server/services/arenas")
  return (await getDefaultArena()).id
}

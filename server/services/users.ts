import "server-only"
import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm"
import { z } from "zod"
import { db, schema } from "@/server/db"
import { AppError, isUniqueViolation, notFound } from "@/server/http/errors"
import { hashPassword } from "@/server/auth/password"
import { revokeAllSessionsFor } from "@/server/auth/session"
import { PERMISSIONS, type Permission, type RoleKey } from "@/lib/domain/constants"
import { recordAudit, type AuditActor } from "./audit"

export const userInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  roleKey: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE", "STAFF", "TICKET_AGENT"]),
  password: z.string().min(10).max(200).optional(),
  isActive: z.boolean().default(true),
  arenaId: z.string().uuid().nullable().optional(),
})

export async function listUsers(opts: { q?: string; roleKey?: string; page?: number; pageSize?: number } = {}) {
  const database = await db()
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const where: SQL[] = [isNull(schema.users.deletedAt)]
  if (opts.q) where.push(or(ilike(schema.users.name, `%${opts.q}%`), ilike(schema.users.email, `%${opts.q}%`))!)
  if (opts.roleKey && opts.roleKey !== "all") where.push(eq(schema.roles.key, opts.roleKey as RoleKey))
  const condition = and(...where)
  const [{ count }] = await database.select({ count: sql<number>`count(*)::int` }).from(schema.users).innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId)).where(condition)
  const items = await database
    .select({ user: schema.users, role: { key: schema.roles.key, name: schema.roles.name } })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(condition)
    .orderBy(desc(schema.users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  return { items: items.map(({ user, role }) => ({ ...sanitize(user), role })), meta: { page, pageSize, total: Number(count), totalPages: Math.max(1, Math.ceil(Number(count) / pageSize)) } }
}

/**
 * Strips every credential before a user row leaves the service. `totpSecret` is
 * encrypted rather than hashed, so it must never travel even to an admin UI;
 * callers get a boolean instead.
 */
function sanitize(u: schema.User) {
  const { passwordHash: _p, totpSecret: _t, ...rest } = u
  void _p
  void _t
  return { ...rest, twoFactorEnabled: Boolean(u.totpEnabledAt) }
}

async function roleByKey(key: RoleKey) {
  const database = await db()
  const role = await database.query.roles.findFirst({ where: eq(schema.roles.key, key) })
  if (!role) throw notFound("Role")
  return role
}

export async function createUser(input: z.infer<typeof userInputSchema>, ctx: { actor: AuditActor; actorRole: RoleKey }) {
  if (input.roleKey === "SUPER_ADMIN" && ctx.actorRole !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only a super admin can create super admins")
  if (!input.password) throw new AppError("VALIDATION_ERROR", "A password is required for new administrators")
  const database = await db()
  const role = await roleByKey(input.roleKey)
  try {
    const [row] = await database
      .insert(schema.users)
      .values({ name: input.name, email: input.email.toLowerCase(), phone: input.phone || null, roleId: role.id, passwordHash: await hashPassword(input.password), isActive: input.isActive, arenaId: input.arenaId ?? null })
      .returning()
    await recordAudit(ctx.actor, { action: "user.create", entityType: "user", entityId: row.id, arenaId: row.arenaId, description: `Created ${role.name} account for ${row.name}`, metadata: { role: role.key } })
    return { ...sanitize(row), role: { key: role.key, name: role.name } }
  } catch (err) {
    if (isUniqueViolation(err, "users_email_lower_idx")) throw new AppError("EMAIL_TAKEN", "An administrator with this email already exists")
    throw err
  }
}

export async function updateUser(id: string, input: Partial<z.infer<typeof userInputSchema>>, ctx: { actor: AuditActor & { id?: string | null }; actorRole: RoleKey }) {
  const database = await db()
  const existing = await database.query.users.findFirst({ where: and(eq(schema.users.id, id), isNull(schema.users.deletedAt)) })
  if (!existing) throw notFound("User")
  const existingRole = (await database.query.roles.findFirst({ where: eq(schema.roles.id, existing.roleId) }))!
  if (existingRole.key === "SUPER_ADMIN" && ctx.actorRole !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only a super admin can modify super admins")
  if (input.roleKey === "SUPER_ADMIN" && ctx.actorRole !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only a super admin can grant the super admin role")
  if (id === ctx.actor.id && (input.isActive === false || (input.roleKey && input.roleKey !== existingRole.key))) {
    throw new AppError("CONFLICT", "You cannot deactivate or change the role of your own account")
  }

  const patch: Partial<schema.User> = { updatedAt: new Date() }
  if (input.name) patch.name = input.name
  if (input.email) patch.email = input.email.toLowerCase()
  if (input.phone !== undefined) patch.phone = input.phone || null
  if (input.isActive !== undefined) patch.isActive = input.isActive
  if (input.arenaId !== undefined) patch.arenaId = input.arenaId
  if (input.roleKey) patch.roleId = (await roleByKey(input.roleKey)).id
  if (input.password) patch.passwordHash = await hashPassword(input.password)

  const [row] = await database.update(schema.users).set(patch).where(eq(schema.users.id, id)).returning()
  const role = (await database.query.roles.findFirst({ where: eq(schema.roles.id, row.roleId) }))!
  // Privilege or status changes take effect immediately.
  if (input.isActive === false || input.password || (input.roleKey && input.roleKey !== existingRole.key)) await revokeAllSessionsFor("user", id)
  await recordAudit(ctx.actor, { action: "user.update", entityType: "user", entityId: id, arenaId: row.arenaId, description: `Updated account for ${row.name}`, metadata: { role: role.key, isActive: row.isActive, passwordChanged: !!input.password } })
  return { ...sanitize(row), role: { key: role.key, name: role.name } }
}

/**
 * Clears another admin's two-factor enrolment so they can sign in with their
 * password again and re-enrol. The way out of a lost authenticator *and* lost
 * recovery codes, which otherwise locks an admin out permanently.
 *
 * Super admins only, and never on yourself. Self-service would be a hole: an
 * attacker sitting at an unlocked admin session could strip the second factor
 * without producing a code, which is exactly what /api/auth/2fa/disable refuses
 * to allow. Resetting someone else needs a second person, which is the point.
 */
export async function resetUserTwoFactor(id: string, ctx: { actor: AuditActor & { id?: string | null }; actorRole: RoleKey }) {
  if (ctx.actorRole !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only a super admin can reset two-factor authentication")
  if (id === ctx.actor.id) {
    throw new AppError("CONFLICT", "Turn off your own two-factor authentication from your account page, where a current code is required")
  }
  const database = await db()
  const existing = await database.query.users.findFirst({ where: and(eq(schema.users.id, id), isNull(schema.users.deletedAt)) })
  if (!existing) throw notFound("User")
  if (!existing.totpEnabledAt) throw new AppError("CONFLICT", `${existing.name} does not have two-factor authentication on`)

  await database
    .update(schema.users)
    .set({ totpSecret: null, totpEnabledAt: null, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
  await database
    .delete(schema.twoFactorRecoveryCodes)
    .where(and(eq(schema.twoFactorRecoveryCodes.principalType, "user"), eq(schema.twoFactorRecoveryCodes.principalId, id)))
  // If the reset was prompted by a lost or stolen device, any session that
  // device still holds should go with it.
  await revokeAllSessionsFor("user", id)
  await recordAudit(ctx.actor, {
    action: "user.two_factor_reset",
    entityType: "user",
    entityId: id,
    arenaId: existing.arenaId,
    description: `Reset two-factor authentication for ${existing.name}`,
  })
}

export async function deleteUser(id: string, ctx: { actor: AuditActor & { id?: string | null }; actorRole: RoleKey }) {
  if (id === ctx.actor.id) throw new AppError("CONFLICT", "You cannot delete your own account")
  const database = await db()
  const existing = await database.query.users.findFirst({ where: and(eq(schema.users.id, id), isNull(schema.users.deletedAt)) })
  if (!existing) throw notFound("User")
  const role = (await database.query.roles.findFirst({ where: eq(schema.roles.id, existing.roleId) }))!
  if (role.key === "SUPER_ADMIN" && ctx.actorRole !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only a super admin can remove super admins")
  await database.update(schema.users).set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() }).where(eq(schema.users.id, id))
  await revokeAllSessionsFor("user", id)
  await recordAudit(ctx.actor, { action: "user.delete", entityType: "user", entityId: id, arenaId: existing.arenaId, description: `Removed account for ${existing.name}` })
}

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------
export async function listRolesWithPermissions() {
  const database = await db()
  const roles = await database.query.roles.findMany({ orderBy: [asc(schema.roles.createdAt)] })
  const perms = await database.query.rolePermissions.findMany()
  const counts = await database.select({ roleId: schema.users.roleId, count: sql<number>`count(*)::int` }).from(schema.users).where(isNull(schema.users.deletedAt)).groupBy(schema.users.roleId)
  return roles.map((r) => ({
    ...r,
    permissions: perms.filter((p) => p.roleId === r.id).map((p) => p.permission as Permission),
    userCount: Number(counts.find((c) => c.roleId === r.id)?.count ?? 0),
  }))
}

export async function setRolePermissions(roleKey: RoleKey, permissions: Permission[], ctx: { actor: AuditActor }) {
  if (roleKey === "SUPER_ADMIN") throw new AppError("CONFLICT", "Super admin permissions cannot be changed")
  const invalid = permissions.filter((p) => !PERMISSIONS.includes(p))
  if (invalid.length) throw new AppError("VALIDATION_ERROR", `Unknown permissions: ${invalid.join(", ")}`)
  const database = await db()
  const role = await roleByKey(roleKey)
  await database.transaction(async (tx) => {
    await tx.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, role.id))
    if (permissions.length) await tx.insert(schema.rolePermissions).values(permissions.map((permission) => ({ roleId: role.id, permission })))
  })
  await recordAudit(ctx.actor, { action: "role.permissions.update", entityType: "role", entityId: role.id, description: `Updated permissions for ${role.name}`, metadata: { permissions } })
  return listRolesWithPermissions()
}

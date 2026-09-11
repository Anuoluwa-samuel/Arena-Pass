import "server-only"
import { eq, sql } from "drizzle-orm"
import type { Database } from "./client"
import * as schema from "./schema"
import { DEFAULT_ROLE_PERMISSIONS, ROLE_KEYS, ROLE_LABELS } from "@/lib/domain/constants"
import { hashPassword } from "@/server/auth/password"
import { logger } from "@/server/observability/logger"
import { DEFAULT_CMS_CONTENT } from "@/lib/cms/defaults"

/**
 * Idempotent baseline: system roles with their permissions, one default
 * arena, default CMS pages and a bootstrap super-admin. Runs on every boot
 * and only inserts what is missing, so it is safe in production too.
 */
export async function ensureBaseline(database: Database) {
  // Roles + permissions
  for (const key of ROLE_KEYS) {
    const [role] = await database
      .insert(schema.roles)
      .values({ key, name: ROLE_LABELS[key], isSystem: true })
      .onConflictDoNothing({ target: schema.roles.key })
      .returning()
    const roleId = role?.id ?? (await database.query.roles.findFirst({ where: eq(schema.roles.key, key) }))!.id
    const existing = await database.query.rolePermissions.findMany({ where: eq(schema.rolePermissions.roleId, roleId) })
    if (existing.length === 0) {
      await database
        .insert(schema.rolePermissions)
        .values(DEFAULT_ROLE_PERMISSIONS[key].map((permission) => ({ roleId, permission })))
        .onConflictDoNothing()
    }
  }

  // Default arena
  let arena = await database.query.arenas.findFirst({ where: eq(schema.arenas.slug, "main") })
  if (!arena) {
    ;[arena] = await database
      .insert(schema.arenas)
      .values({ slug: "main", name: process.env.APP_NAME ?? "Arena Pass", city: "Lagos" })
      .returning()
    logger.info("baseline.arena_created", { arenaId: arena.id })
  }

  // CMS pages
  for (const [slug, content] of Object.entries(DEFAULT_CMS_CONTENT)) {
    await database
      .insert(schema.cmsPages)
      .values({
        arenaId: arena.id,
        slug: slug as keyof typeof DEFAULT_CMS_CONTENT,
        draft: content,
        published: content,
        publishedAt: new Date(),
      })
      .onConflictDoNothing()
  }

  // Bootstrap super admin (credentials from env, dev defaults otherwise)
  const [{ count }] = await database.select({ count: sql<number>`count(*)::int` }).from(schema.users)
  if (Number(count) === 0) {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@arenapass.local"
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "ChangeMe123!"
    const superAdmin = (await database.query.roles.findFirst({ where: eq(schema.roles.key, "SUPER_ADMIN") }))!
    await database.insert(schema.users).values({
      arenaId: arena.id,
      roleId: superAdmin.id,
      email,
      name: "Super Admin",
      passwordHash: await hashPassword(password),
    })
    logger.warn("baseline.admin_created", { email, note: "Change this password immediately" })
  }
}

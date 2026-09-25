import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { and, eq } from "drizzle-orm"
import { schema } from "@/server/db"
import { createTestDb } from "../helpers/db"
import { hashPassword } from "@/server/auth/password"
import { resetUserTwoFactor, listUsers } from "@/server/services/users"
import { beginTwoFactorEnrolment, confirmTwoFactorEnrolment, isTwoFactorEnabled } from "@/server/auth/two-factor"
import { currentTotpCode } from "@/server/auth/totp"
import { createAuthSession } from "@/server/auth/session"
import type { RoleKey } from "@/lib/domain/constants"

let ctx: Awaited<ReturnType<typeof createTestDb>>
beforeAll(async () => {
  ctx = await createTestDb()
})
afterAll(async () => {
  await ctx.client.close()
})

let seq = 0

async function makeAdmin(roleKey: RoleKey = "ADMIN") {
  const role = await ctx.db.query.roles.findFirst({ where: eq(schema.roles.key, roleKey) })
  const [user] = await ctx.db
    .insert(schema.users)
    .values({
      name: `Admin ${seq}`,
      email: `reset${seq++}@arenapass.local`,
      passwordHash: await hashPassword("password-1234"),
      roleId: role!.id,
    })
    .returning()
  return user
}

/** Enrols an admin in 2FA and returns them with their live secret. */
async function enrolledAdmin(roleKey: RoleKey = "ADMIN") {
  const user = await makeAdmin(roleKey)
  const { secret } = await beginTwoFactorEnrolment("user", user.id)
  await confirmTwoFactorEnrolment("user", user.id, currentTotpCode(secret))
  return { user, secret }
}

const actorFor = (id: string) => ({ type: "user" as const, id, name: "Acting Super Admin" })

describe("super admin resets another admin's 2FA", () => {
  it("clears the enrolment so they can sign in with their password again", async () => {
    const { user } = await enrolledAdmin()
    const superAdmin = await makeAdmin("SUPER_ADMIN")
    await resetUserTwoFactor(user.id, { actor: actorFor(superAdmin.id), actorRole: "SUPER_ADMIN" })
    expect(await isTwoFactorEnabled("user", user.id)).toBe(false)
    const row = await ctx.db.query.users.findFirst({ where: eq(schema.users.id, user.id) })
    expect(row?.totpSecret).toBeNull()
    expect(row?.totpEnabledAt).toBeNull()
  })

  it("destroys their recovery codes too", async () => {
    const { user } = await enrolledAdmin()
    const superAdmin = await makeAdmin("SUPER_ADMIN")
    await resetUserTwoFactor(user.id, { actor: actorFor(superAdmin.id), actorRole: "SUPER_ADMIN" })
    const left = await ctx.db.query.twoFactorRecoveryCodes.findMany({
      where: and(
        eq(schema.twoFactorRecoveryCodes.principalType, "user"),
        eq(schema.twoFactorRecoveryCodes.principalId, user.id)
      ),
    })
    expect(left).toHaveLength(0)
  })

  it("signs out every session they still hold", async () => {
    const { user } = await enrolledAdmin()
    await createAuthSession("user", user.id, { ip: "127.0.0.1", userAgent: "vitest" })
    const superAdmin = await makeAdmin("SUPER_ADMIN")
    await resetUserTwoFactor(user.id, { actor: actorFor(superAdmin.id), actorRole: "SUPER_ADMIN" })
    const sessions = await ctx.db.query.authSessions.findMany({
      where: and(eq(schema.authSessions.principalType, "user"), eq(schema.authSessions.principalId, user.id)),
    })
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true)
  })

  it("records the reset in the audit log", async () => {
    const { user } = await enrolledAdmin()
    const superAdmin = await makeAdmin("SUPER_ADMIN")
    await resetUserTwoFactor(user.id, { actor: actorFor(superAdmin.id), actorRole: "SUPER_ADMIN" })
    const entries = await ctx.db.query.auditLogs.findMany({ where: eq(schema.auditLogs.entityId, user.id) })
    expect(entries.some((e) => e.action === "user.two_factor_reset")).toBe(true)
  })
})

describe("guards", () => {
  it("refuses a non-super-admin", async () => {
    const { user } = await enrolledAdmin()
    const plainAdmin = await makeAdmin("ADMIN")
    await expect(
      resetUserTwoFactor(user.id, { actor: actorFor(plainAdmin.id), actorRole: "ADMIN" })
    ).rejects.toThrow(/only a super admin/i)
    expect(await isTwoFactorEnabled("user", user.id)).toBe(true)
  })

  /**
   * The important one. /api/auth/2fa/disable demands a current code precisely so
   * an unlocked session cannot strip the second factor; a super admin resetting
   * *themselves* here would walk straight around that.
   */
  it("refuses to reset your own, which would bypass the code requirement", async () => {
    const { user } = await enrolledAdmin("SUPER_ADMIN")
    await expect(
      resetUserTwoFactor(user.id, { actor: actorFor(user.id), actorRole: "SUPER_ADMIN" })
    ).rejects.toThrow(/your own/i)
    expect(await isTwoFactorEnabled("user", user.id)).toBe(true)
  })

  it("refuses when the target has no 2FA to reset", async () => {
    const target = await makeAdmin("ADMIN")
    const superAdmin = await makeAdmin("SUPER_ADMIN")
    await expect(
      resetUserTwoFactor(target.id, { actor: actorFor(superAdmin.id), actorRole: "SUPER_ADMIN" })
    ).rejects.toThrow(/does not have two-factor/i)
  })

  it("refuses an unknown user", async () => {
    const superAdmin = await makeAdmin("SUPER_ADMIN")
    await expect(
      resetUserTwoFactor("00000000-0000-0000-0000-000000000000", { actor: actorFor(superAdmin.id), actorRole: "SUPER_ADMIN" })
    ).rejects.toThrow()
  })
})

describe("credentials never leave the service", () => {
  it("omits the password hash and the TOTP secret from listed users", async () => {
    await enrolledAdmin()
    const { items } = await listUsers({ pageSize: 50 })
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item).not.toHaveProperty("passwordHash")
      expect(item).not.toHaveProperty("totpSecret")
    }
    expect(items.some((i) => i.twoFactorEnabled)).toBe(true)
  })
})

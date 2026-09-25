import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { eq } from "drizzle-orm"
import { schema } from "@/server/db"
import { createTestDb } from "../helpers/db"
import { hashPassword } from "@/server/auth/password"
import {
  ADMIN_COOKIE,
  ADMIN_IDLE_TIMEOUT_MINUTES,
  CUSTOMER_COOKIE,
  IDLE_TIMEOUT_REASON,
  createAuthSession,
  getCurrentCustomer,
  getCurrentUser,
} from "@/server/auth/session"

let ctx: Awaited<ReturnType<typeof createTestDb>>

/**
 * getCurrentUser reads the session cookie via next/headers, which has no request
 * to bind to under vitest — so the cookie jar is stubbed and each test sets the
 * token it wants resolved.
 */
const jar = new Map<string, string>()
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: () => {},
  }),
}))

beforeAll(async () => {
  ctx = await createTestDb()
})
afterAll(async () => {
  await ctx.client.close()
})

const meta = { ip: "127.0.0.1", userAgent: "vitest" }
let seq = 0

async function makeAdminSession() {
  const role = await ctx.db.query.roles.findFirst({ where: eq(schema.roles.key, "SUPER_ADMIN") })
  const [user] = await ctx.db
    .insert(schema.users)
    .values({
      name: "Idle Tester",
      email: `idle${seq++}@arenapass.local`,
      passwordHash: await hashPassword("password-123"),
      roleId: role!.id,
    })
    .returning()
  const { token, session } = await createAuthSession("user", user.id, meta)
  jar.set(ADMIN_COOKIE, token)
  return { user, session }
}

/** Backdates lastSeenAt to simulate a session left alone for `minutes`. */
async function idleFor(sessionId: string, minutes: number) {
  await ctx.db
    .update(schema.authSessions)
    .set({ lastSeenAt: new Date(Date.now() - minutes * 60_000) })
    .where(eq(schema.authSessions.id, sessionId))
}

describe("admin idle timeout", () => {
  it("is configured for 30 minutes", () => {
    expect(ADMIN_IDLE_TIMEOUT_MINUTES).toBe(30)
  })

  it("keeps an actively used session alive", async () => {
    const { session } = await makeAdminSession()
    await idleFor(session.id, 5)
    expect(await getCurrentUser()).not.toBeNull()
  })

  it("still works right up to the limit", async () => {
    const { session } = await makeAdminSession()
    await idleFor(session.id, 29)
    expect(await getCurrentUser()).not.toBeNull()
  })

  it("signs the admin out once past the limit", async () => {
    const { session } = await makeAdminSession()
    await idleFor(session.id, 31)
    expect(await getCurrentUser()).toBeNull()
  })

  it("records why it ended, so the sign-in page can explain", async () => {
    const { session } = await makeAdminSession()
    await idleFor(session.id, 45)
    await getCurrentUser()
    const row = await ctx.db.query.authSessions.findFirst({ where: eq(schema.authSessions.id, session.id) })
    expect(row?.revokedAt).not.toBeNull()
    expect(row?.revokedReason).toBe(IDLE_TIMEOUT_REASON)
  })

  it("stays revoked — the token cannot be used again after a timeout", async () => {
    const { session } = await makeAdminSession()
    await idleFor(session.id, 31)
    await getCurrentUser()
    expect(await getCurrentUser()).toBeNull()
  })

  it("refreshes lastSeenAt on activity, so the window slides forward", async () => {
    const { session } = await makeAdminSession()
    await idleFor(session.id, 20)
    expect(await getCurrentUser()).not.toBeNull()
    const refreshed = await ctx.db.query.authSessions.findFirst({ where: eq(schema.authSessions.id, session.id) })
    // Back under a minute old, so a further 20 minutes of use will not expire it.
    expect(Date.now() - refreshed!.lastSeenAt.getTime()).toBeLessThan(60_000)
  })
})

describe("customers are exempt", () => {
  it("keeps a customer signed in well past the admin idle limit", async () => {
    const [customer] = await ctx.db
      .insert(schema.customers)
      .values({ name: "Patient Player", email: `idlec${seq++}@example.com`, passwordHash: await hashPassword("password-123") })
      .returning()
    const { token, session } = await createAuthSession("customer", customer.id, meta)
    jar.set(CUSTOMER_COOKIE, token)
    // Two days idle: fine for a booking app, would have ended an admin session many times over.
    await idleFor(session.id, 60 * 48)
    expect(await getCurrentCustomer()).not.toBeNull()
  })
})

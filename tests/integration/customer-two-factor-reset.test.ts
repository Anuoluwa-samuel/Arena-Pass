import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { and, eq } from "drizzle-orm"
import { schema } from "@/server/db"
import { createTestDb } from "../helpers/db"
import { hashPassword } from "@/server/auth/password"
import { listCustomers, getCustomerDetail, resetCustomerTwoFactor } from "@/server/services/customers"
import { beginTwoFactorEnrolment, confirmTwoFactorEnrolment, isTwoFactorEnabled } from "@/server/auth/two-factor"
import { currentTotpCode } from "@/server/auth/totp"
import { createAuthSession } from "@/server/auth/session"

let ctx: Awaited<ReturnType<typeof createTestDb>>
beforeAll(async () => {
  ctx = await createTestDb()
})
afterAll(async () => {
  await ctx.client.close()
})

let seq = 0
const actor = { type: "user" as const, id: undefined, name: "Arena Staff" }

async function enrolledCustomer() {
  const [customer] = await ctx.db
    .insert(schema.customers)
    .values({
      name: `Locked Out ${seq}`,
      email: `creset${seq++}@example.com`,
      passwordHash: await hashPassword("password-123"),
    })
    .returning()
  const { secret } = await beginTwoFactorEnrolment("customer", customer.id)
  await confirmTwoFactorEnrolment("customer", customer.id, currentTotpCode(secret))
  return customer
}

describe("staff reset a customer's 2FA", () => {
  it("clears the enrolment so their password alone signs them in again", async () => {
    const customer = await enrolledCustomer()
    await resetCustomerTwoFactor(customer.id, { actor })
    expect(await isTwoFactorEnabled("customer", customer.id)).toBe(false)
    const row = await ctx.db.query.customers.findFirst({ where: eq(schema.customers.id, customer.id) })
    expect(row?.totpSecret).toBeNull()
    expect(row?.totpEnabledAt).toBeNull()
  })

  it("destroys their recovery codes too", async () => {
    const customer = await enrolledCustomer()
    await resetCustomerTwoFactor(customer.id, { actor })
    const left = await ctx.db.query.twoFactorRecoveryCodes.findMany({
      where: and(
        eq(schema.twoFactorRecoveryCodes.principalType, "customer"),
        eq(schema.twoFactorRecoveryCodes.principalId, customer.id)
      ),
    })
    expect(left).toHaveLength(0)
  })

  it("signs out every session they still hold", async () => {
    const customer = await enrolledCustomer()
    await createAuthSession("customer", customer.id, { ip: "127.0.0.1", userAgent: "vitest" })
    await resetCustomerTwoFactor(customer.id, { actor })
    const sessions = await ctx.db.query.authSessions.findMany({
      where: and(eq(schema.authSessions.principalType, "customer"), eq(schema.authSessions.principalId, customer.id)),
    })
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true)
  })

  it("records the reset in the audit log", async () => {
    const customer = await enrolledCustomer()
    await resetCustomerTwoFactor(customer.id, { actor })
    const entries = await ctx.db.query.auditLogs.findMany({ where: eq(schema.auditLogs.entityId, customer.id) })
    expect(entries.some((e) => e.action === "customer.two_factor_reset")).toBe(true)
  })

  it("leaves an admin's enrolment alone", async () => {
    const customer = await enrolledCustomer()
    const role = await ctx.db.query.roles.findFirst({ where: eq(schema.roles.key, "ADMIN") })
    const [admin] = await ctx.db
      .insert(schema.users)
      .values({ name: "Untouched", email: `untouched${seq++}@arenapass.local`, passwordHash: await hashPassword("password-1234"), roleId: role!.id })
      .returning()
    const { secret } = await beginTwoFactorEnrolment("user", admin.id)
    await confirmTwoFactorEnrolment("user", admin.id, currentTotpCode(secret))

    await resetCustomerTwoFactor(customer.id, { actor })
    // Same principal id space, different principal type: the delete must not stray.
    expect(await isTwoFactorEnabled("user", admin.id)).toBe(true)
  })
})

describe("guards", () => {
  it("refuses when the customer has no 2FA to reset", async () => {
    const [customer] = await ctx.db
      .insert(schema.customers)
      .values({ name: "No 2FA", email: `no2fa${seq++}@example.com`, passwordHash: await hashPassword("password-123") })
      .returning()
    await expect(resetCustomerTwoFactor(customer.id, { actor })).rejects.toThrow(/does not have two-factor/i)
  })

  it("refuses an unknown customer", async () => {
    await expect(resetCustomerTwoFactor("00000000-0000-0000-0000-000000000000", { actor })).rejects.toThrow()
  })
})

describe("credentials never leave the service", () => {
  it("omits the password hash and TOTP secret from the list, but keeps the flags", async () => {
    await enrolledCustomer()
    const { items } = await listCustomers({ pageSize: 50 })
    expect(items.length).toBeGreaterThan(0)
    for (const { customer } of items) {
      expect(customer).not.toHaveProperty("passwordHash")
      expect(customer).not.toHaveProperty("totpSecret")
    }
    expect(items.some((i) => i.customer.twoFactorEnabled)).toBe(true)
    expect(items.some((i) => i.customer.hasPassword)).toBe(true)
  })

  it("omits them from the detail view too", async () => {
    const customer = await enrolledCustomer()
    const { customer: detail } = await getCustomerDetail(customer.id)
    expect(detail).not.toHaveProperty("passwordHash")
    expect(detail).not.toHaveProperty("totpSecret")
    expect(detail.twoFactorEnabled).toBe(true)
  })
})

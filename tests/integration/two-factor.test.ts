import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { and, eq } from "drizzle-orm"
import { schema } from "@/server/db"
import { createTestDb } from "../helpers/db"
import { hashPassword } from "@/server/auth/password"
import {
  beginTwoFactorEnrolment,
  confirmTwoFactorEnrolment,
  consumeTwoFactorChallenge,
  createTwoFactorChallenge,
  disableTwoFactor,
  isTwoFactorEnabled,
  replaceRecoveryCodes,
  twoFactorStatus,
} from "@/server/auth/two-factor"
import { currentTotpCode } from "@/server/auth/totp"

let ctx: Awaited<ReturnType<typeof createTestDb>>
beforeAll(async () => {
  ctx = await createTestDb()
})
afterAll(async () => {
  await ctx.client.close()
})

const meta = { ip: "127.0.0.1", userAgent: "vitest" }
let seq = 0

async function makeCustomer() {
  const [row] = await ctx.db
    .insert(schema.customers)
    .values({ name: "Two Factor Tester", email: `tf${seq++}@example.com`, passwordHash: await hashPassword("password-123") })
    .returning()
  return row
}

/** Walks a fresh customer all the way through enrolment and hands back the live secret. */
async function enrol() {
  const customer = await makeCustomer()
  const { secret } = await beginTwoFactorEnrolment("customer", customer.id)
  const { recoveryCodes } = await confirmTwoFactorEnrolment("customer", customer.id, currentTotpCode(secret))
  return { customer, secret, recoveryCodes }
}

describe("enrolment", () => {
  it("does not enforce anything until a code confirms the authenticator works", async () => {
    const customer = await makeCustomer()
    await beginTwoFactorEnrolment("customer", customer.id)
    // Secret stored, but sign-in must not start demanding codes yet.
    expect(await isTwoFactorEnabled("customer", customer.id)).toBe(false)
    expect((await twoFactorStatus("customer", customer.id)).enabled).toBe(false)
  })

  it("turns on once a correct code is supplied, and issues ten recovery codes", async () => {
    const { customer, recoveryCodes } = await enrol()
    expect(await isTwoFactorEnabled("customer", customer.id)).toBe(true)
    expect(recoveryCodes).toHaveLength(10)
    const status = await twoFactorStatus("customer", customer.id)
    expect(status.enabled).toBe(true)
    expect(status.recoveryCodesLeft).toBe(10)
  })

  it("refuses a wrong code and stays off", async () => {
    const customer = await makeCustomer()
    await beginTwoFactorEnrolment("customer", customer.id)
    await expect(confirmTwoFactorEnrolment("customer", customer.id, "000000")).rejects.toThrow(/not right/i)
    expect(await isTwoFactorEnabled("customer", customer.id)).toBe(false)
  })

  it("refuses to start again while already on", async () => {
    const { customer } = await enrol()
    await expect(beginTwoFactorEnrolment("customer", customer.id)).rejects.toThrow(/already on/i)
  })

  it("stores the secret encrypted, never in the clear", async () => {
    const { customer, secret } = await enrol()
    const row = await ctx.db.query.customers.findFirst({ where: eq(schema.customers.id, customer.id) })
    expect(row?.totpSecret).toBeTruthy()
    expect(row?.totpSecret).not.toContain(secret)
  })
})

describe("sign-in challenge", () => {
  it("accepts the current authenticator code", async () => {
    const { customer, secret } = await enrol()
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    const result = await consumeTwoFactorChallenge("customer", token, currentTotpCode(secret))
    expect(result.principalId).toBe(customer.id)
    expect(result.usedRecoveryCode).toBe(false)
  })

  it("rejects a wrong code", async () => {
    const { customer } = await enrol()
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    await expect(consumeTwoFactorChallenge("customer", token, "000000")).rejects.toThrow(/not right/i)
  })

  it("is single use — a replayed challenge token is refused", async () => {
    const { customer, secret } = await enrol()
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    await consumeTwoFactorChallenge("customer", token, currentTotpCode(secret))
    await expect(consumeTwoFactorChallenge("customer", token, currentTotpCode(secret))).rejects.toThrow(/expired/i)
  })

  it("rejects an expired challenge", async () => {
    const { customer, secret } = await enrol()
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    await ctx.db
      .update(schema.twoFactorChallenges)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.twoFactorChallenges.principalId, customer.id))
    await expect(consumeTwoFactorChallenge("customer", token, currentTotpCode(secret))).rejects.toThrow(/expired/i)
  })

  it("rejects a missing token", async () => {
    await expect(consumeTwoFactorChallenge("customer", undefined, "000000")).rejects.toThrow(/expired/i)
  })

  it("will not let an admin challenge be answered on the customer flow", async () => {
    const { customer, secret } = await enrol()
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    await expect(consumeTwoFactorChallenge("user", token, currentTotpCode(secret))).rejects.toThrow(/expired/i)
  })
})

describe("recovery codes", () => {
  it("lets a recovery code stand in for the authenticator", async () => {
    const { customer, recoveryCodes } = await enrol()
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    const result = await consumeTwoFactorChallenge("customer", token, recoveryCodes[0])
    expect(result.usedRecoveryCode).toBe(true)
  })

  it("burns a used code so it cannot be replayed", async () => {
    const { customer, recoveryCodes } = await enrol()
    const first = await createTwoFactorChallenge("customer", customer.id, meta)
    await consumeTwoFactorChallenge("customer", first.token, recoveryCodes[0])
    const second = await createTwoFactorChallenge("customer", customer.id, meta)
    await expect(consumeTwoFactorChallenge("customer", second.token, recoveryCodes[0])).rejects.toThrow(/not right/i)
    expect((await twoFactorStatus("customer", customer.id)).recoveryCodesLeft).toBe(9)
  })

  it("accepts a code typed back in lowercase without its dash", async () => {
    const { customer, recoveryCodes } = await enrol()
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    const retyped = recoveryCodes[1].toLowerCase().replace("-", "")
    await expect(consumeTwoFactorChallenge("customer", token, retyped)).resolves.toMatchObject({ usedRecoveryCode: true })
  })

  it("retires the old set when new codes are issued", async () => {
    const { customer, recoveryCodes } = await enrol()
    await replaceRecoveryCodes("customer", customer.id)
    const { token } = await createTwoFactorChallenge("customer", customer.id, meta)
    await expect(consumeTwoFactorChallenge("customer", token, recoveryCodes[0])).rejects.toThrow(/not right/i)
  })
})

describe("disabling", () => {
  it("clears the secret and every recovery code", async () => {
    const { customer } = await enrol()
    await disableTwoFactor("customer", customer.id)
    expect(await isTwoFactorEnabled("customer", customer.id)).toBe(false)
    const row = await ctx.db.query.customers.findFirst({ where: eq(schema.customers.id, customer.id) })
    expect(row?.totpSecret).toBeNull()
    expect(row?.totpEnabledAt).toBeNull()
    const left = await ctx.db.query.twoFactorRecoveryCodes.findMany({
      where: and(
        eq(schema.twoFactorRecoveryCodes.principalType, "customer"),
        eq(schema.twoFactorRecoveryCodes.principalId, customer.id)
      ),
    })
    expect(left).toHaveLength(0)
  })
})

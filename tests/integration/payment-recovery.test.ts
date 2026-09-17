import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { schema } from "@/server/db"
import { createTestDb } from "../helpers/db"
import { customer, getAdminUser, makeOpenSession, testActor } from "../helpers/fixtures"
import { createBooking } from "@/server/services/bookings"
import { countPaymentsNeedingRefund, handleProviderWebhook, initializePayment, listPayments, reconcilePendingPayments, refundPayment, verifyPayment } from "@/server/services/payments"
import { getSessionById } from "@/server/services/sessions"
import { setMockOutcome } from "@/server/payments/mock"
import { __setPaymentProviderForTests } from "@/server/payments"
import type { PaymentProvider } from "@/server/payments/provider"

let ctx: Awaited<ReturnType<typeof createTestDb>>
beforeAll(async () => {
  ctx = await createTestDb()
})
afterAll(async () => {
  __setPaymentProviderForTests(undefined)
  await ctx.client.close()
})

async function book(sessionId: string, i: number) {
  const { booking } = await createBooking({ sessionId, customer: customer(i), idempotencyKey: randomUUID() }, { actor: { type: "customer" } })
  const { payment } = await initializePayment(booking.id)
  return { booking, payment }
}
const notificationsFor = (paymentId: string) =>
  ctx.db.query.notifications.findMany({ where: eq(schema.notifications.type, "payment.refund_required") }).then((rows) => rows.filter((r) => (r.data as { paymentId?: string } | null)?.paymentId === paymentId))

describe("paid after the hold expired and the session filled up", () => {
  it("records the charge, flags it for refund, alerts admins once, and refunds without a ticket", async () => {
    const session = await makeOpenSession(ctx.db, { teamsCount: 1, playersPerTeam: 1 })
    const late = await book(session.id, 1000)

    // The hold lapses while the customer is still on the payment page…
    await ctx.db.update(schema.bookings).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.bookings.id, late.booking.id))
    await getSessionById(session.id) // releases the expired hold
    // …and someone else takes (and pays for) the only slot.
    const other = await book(session.id, 1001)
    await setMockOutcome(other.payment.reference, "success")
    expect((await verifyPayment(other.payment.reference)).status).toBe("PAID")

    // Now the late payment succeeds. Callback page and webhook arrive together.
    await setMockOutcome(late.payment.reference, "success")
    const [a, b] = await Promise.all([verifyPayment(late.payment.reference), verifyPayment(late.payment.reference)])
    expect(a.status).toBe("REFUND_REQUIRED")
    expect(b.status).toBe("REFUND_REQUIRED")

    const payment = (await ctx.db.query.payments.findFirst({ where: eq(schema.payments.id, late.payment.id) }))!
    expect(payment.status).toBe("PAID")
    expect(payment.refundRequiredAt).not.toBeNull()
    expect(await ctx.db.query.tickets.findFirst({ where: eq(schema.tickets.bookingId, late.booking.id) })).toBeUndefined()

    const charges = await ctx.db.query.transactions.findMany({ where: and(eq(schema.transactions.paymentId, payment.id), eq(schema.transactions.type, "CHARGE")) })
    expect(charges).toHaveLength(1)
    const audit = await ctx.db.query.auditLogs.findMany({ where: and(eq(schema.auditLogs.action, "payment.refund_required"), eq(schema.auditLogs.entityId, payment.id)) })
    expect(audit).toHaveLength(1)

    const alerts = await notificationsFor(payment.id)
    expect(alerts.filter((n) => n.channel === "IN_APP")).toHaveLength(1)
    const admin = await getAdminUser(ctx.db)
    const emails = alerts.filter((n) => n.channel === "EMAIL")
    expect(emails.map((n) => n.recipientAddress)).toContain(admin.email)
    expect(emails[0].body).toContain(payment.reference)

    // Revisiting the callback page or a webhook retry does not alert again.
    expect((await verifyPayment(late.payment.reference)).status).toBe("REFUND_REQUIRED")
    expect(await notificationsFor(payment.id)).toHaveLength(alerts.length)

    expect(await countPaymentsNeedingRefund()).toBe(1)
    const needs = await listPayments({ status: "NEEDS_REFUND" })
    expect(needs.items.map((r) => r.payment.id)).toEqual([payment.id])

    const refunded = await refundPayment(payment.id, "Session full", { actor: { ...testActor, id: admin.id } })
    expect(refunded.payment.status).toBe("REFUNDED")
    expect(refunded.ticket).toBeNull()
    const refunds = await ctx.db.query.transactions.findMany({ where: and(eq(schema.transactions.paymentId, payment.id), eq(schema.transactions.type, "REFUND")) })
    expect(refunds).toHaveLength(1)
    expect(refunds[0].amount).toBe(-payment.amount)
    expect(await countPaymentsNeedingRefund()).toBe(0)
    // The customer still sees why they were refunded, not "payment failed".
    expect((await verifyPayment(late.payment.reference)).status).toBe("REFUND_REQUIRED")
    // The other customer's ticket is untouched.
    expect((await ctx.db.query.sessions.findFirst({ where: eq(schema.sessions.id, session.id) }))!.bookedCount).toBe(1)
  })
})

describe("reconciling stuck pending payments", () => {
  const backdate = (paymentId: string, ms: number) => ctx.db.update(schema.payments).set({ createdAt: new Date(Date.now() - ms) }).where(eq(schema.payments.id, paymentId))

  it("issues the ticket for a paid-but-unconfirmed payment and leaves fresh or ancient attempts alone", async () => {
    const session = await makeOpenSession(ctx.db, { teamsCount: 2, playersPerTeam: 4 })

    const closedTab = await book(session.id, 1100) // paid, then closed the tab; webhook never arrived
    await setMockOutcome(closedTab.payment.reference, "success")
    await backdate(closedTab.payment.id, 5 * 60_000)

    const stillPaying = await book(session.id, 1101) // on the payment page right now
    await setMockOutcome(stillPaying.payment.reference, "success")

    const declined = await book(session.id, 1102)
    await setMockOutcome(declined.payment.reference, "failed")
    await backdate(declined.payment.id, 10 * 60_000)

    const ancient = await book(session.id, 1103)
    await setMockOutcome(ancient.payment.reference, "success")
    await backdate(ancient.payment.id, 3 * 24 * 60 * 60_000)

    const summary = await reconcilePendingPayments()
    expect(summary.paid).toBeGreaterThanOrEqual(1)
    expect(summary.errors).toBe(0)

    const status = async (id: string) => (await ctx.db.query.payments.findFirst({ where: eq(schema.payments.id, id) }))!.status
    expect(await status(closedTab.payment.id)).toBe("PAID")
    expect(await ctx.db.query.tickets.findFirst({ where: eq(schema.tickets.bookingId, closedTab.booking.id) })).toBeDefined()
    expect(await status(declined.payment.id)).toBe("FAILED")
    expect(await status(stillPaying.payment.id)).toBe("PENDING")
    expect(await status(ancient.payment.id)).toBe("PENDING")
  })
})

describe("provider webhooks", () => {
  it("acknowledges a validly signed event that has nothing to verify, and rejects a bad signature", async () => {
    const stub = (event: Awaited<ReturnType<PaymentProvider["parseWebhook"]>>): PaymentProvider => ({
      name: "stub",
      initialize: async () => ({ authorizationUrl: "https://x" }),
      verify: async () => ({ status: "pending", amount: 0, currency: "NGN" }),
      parseWebhook: async () => event,
      refund: async () => ({ status: "success" }),
    })
    __setPaymentProviderForTests(stub({ type: "refund.processed", raw: {} }))
    await expect(handleProviderWebhook("{}", new Headers())).resolves.toBeNull()

    __setPaymentProviderForTests(stub(null))
    await expect(handleProviderWebhook("{}", new Headers())).rejects.toMatchObject({ code: "FORBIDDEN" })
    __setPaymentProviderForTests(undefined)
  })
})

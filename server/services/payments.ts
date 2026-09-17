import "server-only"
import { and, desc, eq, gte, isNotNull, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm"
import { db, schema, rowsOf, type Transaction } from "@/server/db"
import { env } from "@/server/env"
import { AppError, isUniqueViolation } from "@/server/http/errors"
import { randomToken } from "@/server/auth/tokens"
import { getPaymentProvider } from "@/server/payments"
import type { VerifyResult } from "@/server/payments/provider"
import { logger, serializeError } from "@/server/observability/logger"
import { recordAudit, SYSTEM_ACTOR, type AuditActor } from "./audit"
import { newQrToken, nextTicketNumber, releaseConfirmedTicket } from "./tickets"
import { notify } from "./notifications"
import { refundEmail, refundRequiredAdminEmail, ticketDeliveryEmail } from "@/server/notifications/templates"
import { getSettings } from "./settings"

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------
export async function initializePayment(bookingId: string, opts: { callbackPath?: string } = {}) {
  const database = await db()
  const booking = await database.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) })
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found")
  if (booking.status === "CONFIRMED") throw new AppError("BOOKING_ALREADY_CONFIRMED", "This booking is already paid")
  if (booking.status !== "PENDING") throw new AppError("BOOKING_EXPIRED", "This reservation has expired. Please book again.")
  if (booking.expiresAt < new Date()) throw new AppError("BOOKING_EXPIRED", "This reservation has expired. Please book again.")

  const customer = (await database.query.customers.findFirst({ where: eq(schema.customers.id, booking.customerId) }))!
  const session = (await database.query.sessions.findFirst({ where: eq(schema.sessions.id, booking.sessionId) }))!

  // Reuse an in-flight payment so a refresh doesn't create a second charge attempt.
  const pending = await database.query.payments.findFirst({
    where: and(eq(schema.payments.bookingId, bookingId), eq(schema.payments.status, "PENDING")),
    orderBy: [desc(schema.payments.createdAt)],
  })
  if (pending?.authorizationUrl) return { payment: pending, authorizationUrl: pending.authorizationUrl }

  const provider = getPaymentProvider()
  const reference = `AP-${randomToken(9).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase()}`
  const callbackUrl = new URL(opts.callbackPath ?? "/checkout/callback", env.APP_URL)
  callbackUrl.searchParams.set("reference", reference)

  const [payment] = await database
    .insert(schema.payments)
    .values({ arenaId: booking.arenaId, bookingId, customerId: booking.customerId, provider: provider.name, reference, amount: booking.amount, currency: booking.currency })
    .returning()

  try {
    const init = await provider.initialize({
      reference,
      amount: booking.amount,
      currency: booking.currency,
      email: customer.email,
      callbackUrl: callbackUrl.toString(),
      metadata: { bookingId, sessionId: session.id, sessionTitle: session.title, customerName: customer.name },
    })
    const [updated] = await database
      .update(schema.payments)
      .set({ authorizationUrl: init.authorizationUrl, providerTransactionId: init.providerReference ?? null, updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id))
      .returning()
    return { payment: updated, authorizationUrl: init.authorizationUrl }
  } catch (err) {
    await database.update(schema.payments).set({ status: "FAILED", failureReason: "Initialization failed", updatedAt: new Date() }).where(eq(schema.payments.id, payment.id))
    throw err
  }
}

// ---------------------------------------------------------------------------
// Verify + confirm
// ---------------------------------------------------------------------------
export type VerifyOutcome =
  | { status: "PAID"; payment: schema.Payment; ticket: schema.Ticket }
  | { status: "PENDING"; payment: schema.Payment }
  | { status: "FAILED"; payment: schema.Payment }
  /** Charged, but no ticket could be issued (the session filled after the hold expired). Admins are alerted to refund. */
  | { status: "REFUND_REQUIRED"; payment: schema.Payment }

/**
 * The only path that turns a booking into a ticket. Always re-checks with
 * the provider (never the client's redirect parameters), validates amount
 * and currency, then confirms in one transaction. Safe to call repeatedly
 * from the callback page, the webhook and a reconciliation job.
 */
export async function verifyPayment(reference: string): Promise<VerifyOutcome> {
  const database = await db()
  const payment = await database.query.payments.findFirst({ where: eq(schema.payments.reference, reference) })
  if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "Payment not found")

  if (payment.status === "PAID") {
    const ticket = await database.query.tickets.findFirst({ where: eq(schema.tickets.bookingId, payment.bookingId) })
    if (ticket) return { status: "PAID", payment, ticket }
    // Already flagged: don't re-verify or alert admins again.
    if (payment.refundRequiredAt) return { status: "REFUND_REQUIRED", payment }
  }
  if (payment.status === "REFUNDED" && payment.refundRequiredAt) return { status: "REFUND_REQUIRED", payment }
  if (payment.status === "FAILED" || payment.status === "REFUNDED") return { status: "FAILED", payment }

  const provider = getPaymentProvider()
  const result = await provider.verify(reference)

  if (result.status === "pending") return { status: "PENDING", payment }

  if (result.status === "failed") {
    const [failed] = await database
      .update(schema.payments)
      .set({ status: "FAILED", failureReason: result.failureReason ?? "Payment failed", providerPayload: (result.raw as object) ?? payment.providerPayload, providerTransactionId: result.providerTransactionId ?? payment.providerTransactionId, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id))
      .returning()
    return { status: "FAILED", payment: failed }
  }

  // Success: amounts must match exactly; a tampered/partial charge is not a confirmation.
  if (result.amount !== payment.amount || result.currency.toUpperCase() !== payment.currency.toUpperCase()) {
    logger.error("payment.amount_mismatch", { reference, expected: payment.amount, got: result.amount, currency: result.currency })
    const [flagged] = await database
      .update(schema.payments)
      .set({ status: "FAILED", failureReason: `Amount mismatch: expected ${payment.amount} ${payment.currency}, provider reported ${result.amount} ${result.currency}`, providerPayload: (result.raw as object) ?? null, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id))
      .returning()
    await recordAudit(SYSTEM_ACTOR, { action: "payment.amount_mismatch", entityType: "payment", entityId: payment.id, arenaId: payment.arenaId, description: `Payment ${reference} amount mismatch flagged for review` })
    return { status: "FAILED", payment: flagged }
  }

  let confirmed: { payment: schema.Payment; ticket: schema.Ticket }
  try {
    confirmed = await database.transaction(async (tx) => {
    const [lockedPayment] = await tx.select().from(schema.payments).where(eq(schema.payments.id, payment.id)).for("update")
    if (lockedPayment.status === "PAID") {
      const existing = await tx.query.tickets.findFirst({ where: eq(schema.tickets.bookingId, lockedPayment.bookingId) })
      if (existing) return { payment: lockedPayment, ticket: existing }
    }
    const [paid] = await tx
      .update(schema.payments)
      .set({ status: "PAID", providerTransactionId: result.providerTransactionId ?? lockedPayment.providerTransactionId, channel: result.channel ?? null, providerPayload: (result.raw as object) ?? null, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id))
      .returning()
    await tx.insert(schema.transactions).values({
      arenaId: paid.arenaId,
      paymentId: paid.id,
      type: "CHARGE",
      amount: paid.amount,
      currency: paid.currency,
      provider: paid.provider,
      providerReference: paid.providerTransactionId,
    })
    const ticket = await confirmBookingAndIssueTicket(tx, paid.bookingId)
    await tx.update(schema.transactions).set({ ticketId: ticket.id }).where(eq(schema.transactions.paymentId, paid.id))
    return { payment: paid, ticket }
    })
  } catch (err) {
    // The whole confirmation rolled back, but the customer's money was taken.
    // Record it in its own transaction and alert admins.
    if (err instanceof AppError && err.code === "SESSION_FULL") return flagRefundRequired(payment.id, result)
    throw err
  }

  await afterTicketIssued(confirmed.ticket).catch((err) => logger.error("payment.post_confirm_failed", { error: serializeError(err) }))
  return { status: "PAID", ...confirmed }
}

/**
 * Inside the caller's transaction: lock booking + session, move the held
 * slot to CONFIRMED, bump the confirmed counter and create the ticket. The
 * unique index on tickets.booking_id guarantees exactly one ticket per
 * booking even if two verifications race.
 */
async function confirmBookingAndIssueTicket(tx: Transaction, bookingId: string): Promise<schema.Ticket> {
  const now = new Date()
  const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).for("update")
  if (!booking) throw new AppError("BOOKING_NOT_FOUND", "Booking not found")
  const [session] = await tx.select().from(schema.sessions).where(eq(schema.sessions.id, booking.sessionId)).for("update")

  if (booking.status === "CONFIRMED") {
    const existing = await tx.query.tickets.findFirst({ where: eq(schema.tickets.bookingId, bookingId) })
    if (existing) return existing
  }

  let slotId = booking.slotId
  let teamId = booking.teamId
  let heldDelta = -1
  if (booking.status !== "PENDING") {
    // The hold expired before the provider confirmed. Re-claim any free slot
    // so a paying customer is never turned away while capacity remains.
    const reclaimed = await tx.execute(sql`
      update ${schema.sessionSlots} set status = 'CONFIRMED', booking_id = ${booking.id}, updated_at = ${now}
       where id = (select id from ${schema.sessionSlots} where session_id = ${booking.sessionId} and status = 'FREE' order by slot_number, team_number limit 1 for update skip locked)
       returning id, team_id`)
    const row = rowsOf<{ id: string; team_id: string }>(reclaimed)[0]
    // No free slot left. Throwing rolls back this transaction; verifyPayment
    // catches it and records the charge + refund flag separately.
    if (!row) throw new AppError("SESSION_FULL", "Your reservation expired and the session is now full. Your payment will be refunded.")
    slotId = row.id
    teamId = row.team_id
    heldDelta = 0
  } else {
    await tx.update(schema.sessionSlots).set({ status: "CONFIRMED", updatedAt: now }).where(eq(schema.sessionSlots.bookingId, booking.id))
  }

  await tx
    .update(schema.bookings)
    .set({ status: "CONFIRMED", confirmedAt: now, slotId, teamId, updatedAt: now })
    .where(eq(schema.bookings.id, booking.id))

  const bookedCount = session.bookedCount + 1
  await tx
    .update(schema.sessions)
    .set({
      bookedCount,
      heldCount: sql`greatest(0, ${schema.sessions.heldCount} + ${heldDelta})`,
      status: bookedCount >= session.totalCapacity && ["PUBLISHED", "OPEN_FOR_BOOKING"].includes(session.status) ? "FULL" : session.status,
      updatedAt: now,
    })
    .where(eq(schema.sessions.id, session.id))

  try {
    const [ticket] = await tx
      .insert(schema.tickets)
      .values({
        arenaId: booking.arenaId,
        ticketNumber: await nextTicketNumber(tx),
        bookingId: booking.id,
        sessionId: booking.sessionId,
        customerId: booking.customerId,
        teamId,
        slotId,
        playerName: booking.playerName,
        price: booking.amount,
        currency: booking.currency,
        paymentStatus: "PAID",
        status: "CONFIRMED",
        qrToken: newQrToken(),
        expiresAt: session.endsAt,
      })
      .returning()
    return ticket
  } catch (err) {
    if (isUniqueViolation(err, "tickets_booking_idx")) {
      const existing = await tx.query.tickets.findFirst({ where: eq(schema.tickets.bookingId, bookingId) })
      if (existing) return existing
    }
    throw err
  }
}

const REFUND_REQUIRED_REASON = "Paid after the reservation expired; the session filled up in the meantime, so no ticket was issued."

/**
 * Records a successful charge that could not become a ticket. Runs in its own
 * transaction (the confirmation one rolled back). Idempotent: concurrent or
 * repeated verifications (callback page, webhook, reconciliation) alert once.
 */
async function flagRefundRequired(paymentId: string, result: VerifyResult): Promise<VerifyOutcome> {
  const database = await db()
  const { payment, flaggedNow } = await database.transaction(async (tx) => {
    const [locked] = await tx.select().from(schema.payments).where(eq(schema.payments.id, paymentId)).for("update")
    if (locked.refundRequiredAt) return { payment: locked, flaggedNow: false }
    const now = new Date()
    const [flagged] = await tx
      .update(schema.payments)
      .set({
        status: "PAID",
        providerTransactionId: result.providerTransactionId ?? locked.providerTransactionId,
        channel: result.channel ?? locked.channel,
        providerPayload: (result.raw as object) ?? locked.providerPayload,
        verifiedAt: now,
        refundRequiredAt: now,
        refundRequiredReason: REFUND_REQUIRED_REASON,
        updatedAt: now,
      })
      .where(eq(schema.payments.id, paymentId))
      .returning()
    // The money did arrive, so the ledger records the charge; the refund will offset it.
    await tx.insert(schema.transactions).values({
      arenaId: flagged.arenaId,
      paymentId: flagged.id,
      type: "CHARGE",
      amount: flagged.amount,
      currency: flagged.currency,
      provider: flagged.provider,
      providerReference: flagged.providerTransactionId,
    })
    return { payment: flagged, flaggedNow: true }
  })
  if (flaggedNow) {
    logger.warn("payment.refund_required", { reference: payment.reference, amount: payment.amount })
    await recordAudit(SYSTEM_ACTOR, { action: "payment.refund_required", entityType: "payment", entityId: payment.id, arenaId: payment.arenaId, description: `Payment ${payment.reference} succeeded after the reservation expired and the session is full; refund required`, metadata: { amount: payment.amount, currency: payment.currency } })
    await alertAdminsRefundRequired(payment).catch((err) => logger.error("payment.refund_alert_failed", { reference: payment.reference, error: serializeError(err) }))
  }
  return { status: "REFUND_REQUIRED", payment }
}

/** Emails every active admin who can issue refunds, and records an in-app alert. */
async function alertAdminsRefundRequired(payment: schema.Payment) {
  const database = await db()
  const [customer, booking, settings] = await Promise.all([
    database.query.customers.findFirst({ where: eq(schema.customers.id, payment.customerId) }),
    database.query.bookings.findFirst({ where: eq(schema.bookings.id, payment.bookingId) }),
    getSettings(payment.arenaId),
  ])
  const session = booking ? await database.query.sessions.findFirst({ where: eq(schema.sessions.id, booking.sessionId) }) : undefined
  const paymentsUrl = new URL("/admin/payments?status=NEEDS_REFUND", env.APP_URL).toString()
  const details = {
    appName: settings.siteName,
    customerName: customer?.name ?? "A customer",
    customerEmail: customer?.email ?? "unknown",
    sessionTitle: session?.title ?? "a session",
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    paymentsUrl,
  }
  const email = refundRequiredAdminEmail(details)
  await notify({ arenaId: payment.arenaId, recipientType: "system", channel: "IN_APP", type: "payment.refund_required", title: email.subject, body: email.text, data: { paymentId: payment.id } })

  const admins = await database
    .selectDistinct({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .innerJoin(schema.rolePermissions, eq(schema.rolePermissions.roleId, schema.users.roleId))
    .where(
      and(
        eq(schema.rolePermissions.permission, "tickets.refund"),
        eq(schema.users.isActive, true),
        isNull(schema.users.deletedAt),
        or(eq(schema.users.arenaId, payment.arenaId), isNull(schema.users.arenaId))
      )
    )
  for (const admin of admins) {
    await notify({ arenaId: payment.arenaId, recipientType: "user", recipientId: admin.id, recipientAddress: admin.email, channel: "EMAIL", type: "payment.refund_required", title: email.subject, body: email.text, html: email.html, data: { paymentId: payment.id } })
  }
}

/** Charged-but-no-ticket payments still waiting for an admin refund. */
export async function countPaymentsNeedingRefund(arenaId?: string | null) {
  const database = await db()
  const where = [eq(schema.payments.status, "PAID"), isNotNull(schema.payments.refundRequiredAt)]
  if (arenaId) where.push(eq(schema.payments.arenaId, arenaId))
  const [{ count }] = await database.select({ count: sql<number>`count(*)::int` }).from(schema.payments).where(and(...where))
  return Number(count)
}

async function afterTicketIssued(ticket: schema.Ticket) {
  const database = await db()
  const [customer, session, slot] = await Promise.all([
    database.query.customers.findFirst({ where: eq(schema.customers.id, ticket.customerId) }),
    database.query.sessions.findFirst({ where: eq(schema.sessions.id, ticket.sessionId) }),
    ticket.slotId ? database.query.sessionSlots.findFirst({ where: eq(schema.sessionSlots.id, ticket.slotId) }) : null,
  ])
  if (!customer || !session) return
  const settings = await getSettings(session.arenaId)
  const ticketUrl = new URL(`/tickets/${ticket.ticketNumber}`, env.APP_URL).toString()
  const email = ticketDeliveryEmail({
    appName: settings.siteName,
    customerName: customer.name,
    ticketNumber: ticket.ticketNumber,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    venue: session.venue,
    teamNumber: slot?.teamNumber ?? null,
    slotNumber: slot?.slotNumber ?? null,
    amount: ticket.price,
    currency: ticket.currency,
    ticketUrl,
  })
  await notify({ arenaId: ticket.arenaId, recipientType: "customer", recipientId: customer.id, recipientAddress: customer.email, channel: "EMAIL", type: "ticket.delivery", title: email.subject, body: email.text, html: email.html, data: { ticketId: ticket.id } })
  await notify({ arenaId: ticket.arenaId, recipientType: "system", channel: "IN_APP", type: "ticket.sold", title: `${customer.name} purchased a ticket`, body: `${ticket.ticketNumber} for ${session.title}`, data: { ticketId: ticket.id, sessionId: session.id } })
  const pct = Math.round((session.bookedCount / session.totalCapacity) * 100)
  if ([50, 80, 100].includes(pct)) {
    await notify({ arenaId: ticket.arenaId, recipientType: "system", channel: "IN_APP", type: "session.occupancy", title: `"${session.title}" reached ${pct}%`, body: `${session.bookedCount}/${session.totalCapacity} players booked`, data: { sessionId: session.id, pct } })
  }
  await recordAudit({ type: "customer", id: customer.id, name: customer.name }, { action: "ticket.issue", entityType: "ticket", entityId: ticket.id, arenaId: ticket.arenaId, description: `Ticket ${ticket.ticketNumber} issued to ${customer.name} for "${session.title}"` })
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------
export async function handleProviderWebhook(rawBody: string, headers: Headers) {
  const provider = getPaymentProvider()
  const event = await provider.parseWebhook(rawBody, headers)
  if (!event) throw new AppError("FORBIDDEN", "Invalid webhook signature")
  logger.info("payment.webhook", { type: event.type, reference: event.reference })
  // Acknowledge events we don't act on (refund.processed, transfer.*…): a non-2xx makes the provider retry forever.
  if (!event.reference) return null
  try {
    return await verifyPayment(event.reference)
  } catch (err) {
    if (err instanceof AppError && err.code === "PAYMENT_NOT_FOUND") return null
    throw err
  }
}

/** How far back reconciliation looks. Older pending attempts were abandoned; the provider reports them as such anyway. */
const RECONCILE_MIN_AGE_MS = 2 * 60_000
const RECONCILE_WINDOW_MS = 48 * 60 * 60_000
const RECONCILE_BATCH = 50

/**
 * Re-asks the provider about payments still PENDING, so a customer who paid and
 * closed the tab still gets their ticket even if the webhook never arrived.
 * Skips attempts younger than 2 minutes (the customer is probably still on the
 * payment page). Runs from the housekeeping cron; each payment is independent.
 */
export async function reconcilePendingPayments(now = new Date()) {
  const database = await db()
  const stale = await database
    .select({ reference: schema.payments.reference })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.status, "PENDING"),
        lt(schema.payments.createdAt, new Date(now.getTime() - RECONCILE_MIN_AGE_MS)),
        gte(schema.payments.createdAt, new Date(now.getTime() - RECONCILE_WINDOW_MS))
      )
    )
    .orderBy(schema.payments.createdAt)
    .limit(RECONCILE_BATCH)

  const summary = { checked: stale.length, paid: 0, failed: 0, pending: 0, refundRequired: 0, errors: 0 }
  for (const { reference } of stale) {
    try {
      const outcome = await verifyPayment(reference)
      if (outcome.status === "PAID") summary.paid++
      else if (outcome.status === "FAILED") summary.failed++
      else if (outcome.status === "REFUND_REQUIRED") summary.refundRequired++
      else summary.pending++
    } catch (err) {
      summary.errors++
      logger.warn("payment.reconcile_failed", { reference, error: serializeError(err) })
    }
  }
  if (summary.checked) logger.info("payment.reconciled", summary)
  return summary
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------
export async function refundPayment(paymentId: string, reason: string, ctx: { actor: AuditActor & { id: string } }) {
  const database = await db()
  const payment = await database.query.payments.findFirst({ where: eq(schema.payments.id, paymentId) })
  if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "Payment not found")
  if (payment.status !== "PAID") throw new AppError("CONFLICT", "Only paid payments can be refunded")
  const ticket = await database.query.tickets.findFirst({ where: eq(schema.tickets.bookingId, payment.bookingId) })
  if (!ticket && !payment.refundRequiredAt) throw new AppError("TICKET_NOT_FOUND", "No ticket found for this payment")
  if (ticket?.status === "REFUNDED") throw new AppError("CONFLICT", "Ticket is already refunded")

  const provider = getPaymentProvider()
  const providerResult = await provider.refund({ providerTransactionId: payment.providerTransactionId ?? payment.reference, amount: payment.amount, reason })
  if (providerResult.status === "failed") throw new AppError("PAYMENT_PROVIDER_ERROR", "The provider rejected the refund")

  const result = await database.transaction(async (tx) => {
    // Ticketless (refund-required) payments have no slot or ticket to release.
    let updatedTicket: schema.Ticket | null = null
    if (ticket) {
      const [lockedTicket] = await tx.select().from(schema.tickets).where(eq(schema.tickets.id, ticket.id)).for("update")
      updatedTicket =
        lockedTicket.status === "CONFIRMED"
          ? await releaseConfirmedTicket(tx, lockedTicket, "REFUNDED", reason)
          : (await tx.update(schema.tickets).set({ status: "REFUNDED", paymentStatus: "REFUNDED", refundedAt: new Date(), updatedAt: new Date() }).where(eq(schema.tickets.id, ticket.id)).returning())[0]
    }
    const [updatedPayment] = await tx.update(schema.payments).set({ status: "REFUNDED", updatedAt: new Date() }).where(eq(schema.payments.id, payment.id)).returning()
    await tx.insert(schema.transactions).values({
      arenaId: payment.arenaId,
      paymentId: payment.id,
      ticketId: ticket?.id ?? null,
      type: "REFUND",
      amount: -payment.amount,
      currency: payment.currency,
      provider: provider.name,
      providerReference: providerResult.providerReference ?? null,
      reason,
      performedBy: ctx.actor.id,
    })
    return { payment: updatedPayment, ticket: updatedTicket }
  })

  const customer = await database.query.customers.findFirst({ where: eq(schema.customers.id, payment.customerId) })
  if (customer) {
    const settings = await getSettings(payment.arenaId)
    const email = refundEmail({ appName: settings.siteName, customerName: customer.name, itemLabel: ticket ? `ticket ${ticket.ticketNumber}` : `payment ${payment.reference}`, amount: payment.amount, currency: payment.currency })
    await notify({ arenaId: payment.arenaId, recipientType: "customer", recipientId: customer.id, recipientAddress: customer.email, channel: "EMAIL", type: "payment.refund", title: email.subject, body: email.text, html: email.html })
  }
  await recordAudit(ctx.actor, { action: "payment.refund", entityType: "payment", entityId: payment.id, arenaId: payment.arenaId, description: `Refunded ${ticket?.ticketNumber ?? payment.reference}`, metadata: { amount: payment.amount, reason } })
  return result
}

// ---------------------------------------------------------------------------
// Admin reads
// ---------------------------------------------------------------------------
export async function listPayments(opts: { status?: string; from?: Date; to?: Date; q?: string; page?: number; pageSize?: number } = {}) {
  const database = await db()
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const where: SQL[] = []
  if (opts.status === "NEEDS_REFUND") where.push(eq(schema.payments.status, "PAID"), isNotNull(schema.payments.refundRequiredAt))
  else if (opts.status && opts.status !== "all") where.push(eq(schema.payments.status, opts.status as schema.Payment["status"]))
  if (opts.from) where.push(gte(schema.payments.createdAt, opts.from))
  if (opts.to) where.push(lte(schema.payments.createdAt, opts.to))
  if (opts.q) where.push(sql`(${schema.payments.reference} ilike ${"%" + opts.q + "%"} or ${schema.customers.name} ilike ${"%" + opts.q + "%"} or ${schema.customers.email} ilike ${"%" + opts.q + "%"})`)
  const condition = where.length ? and(...where) : undefined
  const [{ count }] = await database.select({ count: sql<number>`count(*)::int` }).from(schema.payments).innerJoin(schema.customers, eq(schema.customers.id, schema.payments.customerId)).where(condition)
  const items = await database
    .select({
      payment: schema.payments,
      customer: { id: schema.customers.id, name: schema.customers.name, email: schema.customers.email },
      session: { id: schema.sessions.id, title: schema.sessions.title, startsAt: schema.sessions.startsAt },
      ticket: { id: schema.tickets.id, ticketNumber: schema.tickets.ticketNumber, status: schema.tickets.status },
    })
    .from(schema.payments)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.payments.customerId))
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .innerJoin(schema.sessions, eq(schema.sessions.id, schema.bookings.sessionId))
    .leftJoin(schema.tickets, eq(schema.tickets.bookingId, schema.bookings.id))
    .where(condition)
    .orderBy(desc(schema.payments.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  return { items, meta: { page, pageSize, total: Number(count), totalPages: Math.max(1, Math.ceil(Number(count) / pageSize)) } }
}

export async function listTransactions(opts: { page?: number; pageSize?: number } = {}) {
  const database = await db()
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 50
  const [{ count }] = await database.select({ count: sql<number>`count(*)::int` }).from(schema.transactions)
  const items = await database
    .select({ transaction: schema.transactions, payment: { reference: schema.payments.reference }, ticket: { ticketNumber: schema.tickets.ticketNumber } })
    .from(schema.transactions)
    .innerJoin(schema.payments, eq(schema.payments.id, schema.transactions.paymentId))
    .leftJoin(schema.tickets, eq(schema.tickets.id, schema.transactions.ticketId))
    .orderBy(desc(schema.transactions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  return { items, meta: { page, pageSize, total: Number(count), totalPages: Math.max(1, Math.ceil(Number(count) / pageSize)) } }
}

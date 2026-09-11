import "server-only"
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import QRCode from "qrcode"
import { db, schema, rowsOf, type Transaction } from "@/server/db"
import { env } from "@/server/env"
import { AppError } from "@/server/http/errors"
import { hmac, randomToken, safeEqual } from "@/server/auth/tokens"
import { recordAudit, type AuditActor } from "./audit"

const QR_PREFIX = "AP1"

/** Ticket numbers look like AP-2026-000124: year + zero-padded global sequence. */
export async function nextTicketNumber(tx: Transaction) {
  const res = await tx.execute(sql`select nextval('ticket_number_seq') as n`)
  const n = Number(rowsOf<{ n: string | number }>(res)[0].n)
  return `AP-${new Date().getFullYear()}-${String(n).padStart(6, "0")}`
}

/** Opaque reference + HMAC. Contains no personal data; forgeries fail before a DB hit. */
export function buildQrPayload(qrToken: string) {
  return `${QR_PREFIX}.${qrToken}.${hmac(env.QR_SECRET, qrToken).slice(0, 22)}`
}

export function parseQrPayload(value: string): { qrToken: string } | null {
  const parts = value.trim().split(".")
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) return null
  const [, token, sig] = parts
  if (!token || !sig) return null
  const expected = hmac(env.QR_SECRET, token).slice(0, 22)
  return safeEqual(sig, expected) ? { qrToken: token } : null
}

export async function qrDataUrl(qrToken: string) {
  return QRCode.toDataURL(buildQrPayload(qrToken), { errorCorrectionLevel: "M", margin: 1, width: 320, color: { dark: "#0b0f14", light: "#ffffff" } })
}

export function newQrToken() {
  return randomToken(24)
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function getTicketByNumber(ticketNumber: string) {
  const database = await db()
  const ticket = await database.query.tickets.findFirst({ where: eq(schema.tickets.ticketNumber, ticketNumber) })
  if (!ticket) throw new AppError("TICKET_NOT_FOUND", "Ticket not found")
  return hydrateTicket(ticket)
}

export async function getTicketById(id: string) {
  const database = await db()
  const ticket = await database.query.tickets.findFirst({ where: eq(schema.tickets.id, id) })
  if (!ticket) throw new AppError("TICKET_NOT_FOUND", "Ticket not found")
  return hydrateTicket(ticket)
}

export async function hydrateTicket(ticket: schema.Ticket) {
  const database = await db()
  const [session, customer, team, slot, arena] = await Promise.all([
    database.query.sessions.findFirst({ where: eq(schema.sessions.id, ticket.sessionId) }),
    database.query.customers.findFirst({ where: eq(schema.customers.id, ticket.customerId) }),
    ticket.teamId ? database.query.teams.findFirst({ where: eq(schema.teams.id, ticket.teamId) }) : null,
    ticket.slotId ? database.query.sessionSlots.findFirst({ where: eq(schema.sessionSlots.id, ticket.slotId) }) : null,
    database.query.arenas.findFirst({ where: eq(schema.arenas.id, ticket.arenaId) }),
  ])
  return { ticket, session: session!, customer: customer!, team: team ?? null, slot: slot ?? null, arena: arena ?? null }
}

export type TicketDetail = Awaited<ReturnType<typeof hydrateTicket>>

export async function listTickets(opts: { status?: string; sessionId?: string; customerId?: string; q?: string; page?: number; pageSize?: number } = {}) {
  const database = await db()
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const where: SQL[] = []
  if (opts.status && opts.status !== "all") where.push(eq(schema.tickets.status, opts.status as schema.Ticket["status"]))
  if (opts.sessionId) where.push(eq(schema.tickets.sessionId, opts.sessionId))
  if (opts.customerId) where.push(eq(schema.tickets.customerId, opts.customerId))
  if (opts.q)
    where.push(or(ilike(schema.tickets.ticketNumber, `%${opts.q}%`), ilike(schema.customers.name, `%${opts.q}%`), ilike(schema.customers.email, `%${opts.q}%`), ilike(schema.tickets.playerName, `%${opts.q}%`))!)
  const condition = where.length ? and(...where) : undefined
  const base = database
    .select({
      ticket: schema.tickets,
      customer: { id: schema.customers.id, name: schema.customers.name, email: schema.customers.email },
      session: { id: schema.sessions.id, title: schema.sessions.title, startsAt: schema.sessions.startsAt, venue: schema.sessions.venue },
      slot: { teamNumber: schema.sessionSlots.teamNumber, slotNumber: schema.sessionSlots.slotNumber },
    })
    .from(schema.tickets)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.tickets.customerId))
    .innerJoin(schema.sessions, eq(schema.sessions.id, schema.tickets.sessionId))
    .leftJoin(schema.sessionSlots, eq(schema.sessionSlots.id, schema.tickets.slotId))
  const [{ count }] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tickets)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.tickets.customerId))
    .where(condition)
  const items = await base.where(condition).orderBy(desc(schema.tickets.purchasedAt)).limit(pageSize).offset((page - 1) * pageSize)
  return { items, meta: { page, pageSize, total: Number(count), totalPages: Math.max(1, Math.ceil(Number(count) / pageSize)) } }
}

// ---------------------------------------------------------------------------
// Validation (entry scanning)
// ---------------------------------------------------------------------------
export type ValidationOutcome =
  | { result: "VALID"; ticket: TicketDetail }
  | { result: "ALREADY_USED"; ticket: TicketDetail }
  | { result: "NOT_VALID"; ticket: TicketDetail; reason: string }
  | { result: "WRONG_SESSION"; ticket: TicketDetail }
  | { result: "INVALID" }

/**
 * Looks up a scanned code (QR payload or ticket number). With mode "admit"
 * it atomically marks the ticket USED; a second scan reports ALREADY_USED.
 */
export async function validateTicket(
  scanned: string,
  opts: { mode: "check" | "admit"; expectedSessionId?: string; actor: AuditActor & { id: string } }
): Promise<ValidationOutcome> {
  const database = await db()
  const parsed = parseQrPayload(scanned)
  const value = scanned.trim().toUpperCase()
  const ticketRow = parsed
    ? await database.query.tickets.findFirst({ where: eq(schema.tickets.qrToken, parsed.qrToken) })
    : /^AP-\d{4}-\d{6}$/.test(value)
      ? await database.query.tickets.findFirst({ where: eq(schema.tickets.ticketNumber, value) })
      : null

  const log = (ticketId: string | null, sessionId: string | null, result: string) =>
    database.insert(schema.ticketValidations).values({ ticketId, sessionId, validatedBy: opts.actor.id, result, scannedValue: scanned.slice(0, 200) })

  if (!ticketRow) {
    await log(null, opts.expectedSessionId ?? null, "INVALID")
    return { result: "INVALID" }
  }

  const detail = await hydrateTicket(ticketRow)
  if (opts.expectedSessionId && ticketRow.sessionId !== opts.expectedSessionId) {
    await log(ticketRow.id, ticketRow.sessionId, "WRONG_SESSION")
    return { result: "WRONG_SESSION", ticket: detail }
  }
  if (ticketRow.status === "USED") {
    await log(ticketRow.id, ticketRow.sessionId, "ALREADY_USED")
    return { result: "ALREADY_USED", ticket: detail }
  }
  if (ticketRow.status !== "CONFIRMED") {
    await log(ticketRow.id, ticketRow.sessionId, "NOT_VALID")
    return { result: "NOT_VALID", ticket: detail, reason: `Ticket is ${ticketRow.status.toLowerCase()}` }
  }
  if (detail.session.status === "CANCELLED") {
    await log(ticketRow.id, ticketRow.sessionId, "NOT_VALID")
    return { result: "NOT_VALID", ticket: detail, reason: "Session was cancelled" }
  }
  if (new Date() > new Date(detail.session.endsAt.getTime() + 2 * 3_600_000)) {
    await log(ticketRow.id, ticketRow.sessionId, "NOT_VALID")
    return { result: "NOT_VALID", ticket: detail, reason: "Session has ended" }
  }

  if (opts.mode === "check") {
    await log(ticketRow.id, ticketRow.sessionId, "CHECK_VALID")
    return { result: "VALID", ticket: detail }
  }

  // Conditional update: only one admit can flip CONFIRMED → USED.
  const [used] = await database
    .update(schema.tickets)
    .set({ status: "USED", usedAt: new Date(), validatedBy: opts.actor.id, updatedAt: new Date() })
    .where(and(eq(schema.tickets.id, ticketRow.id), eq(schema.tickets.status, "CONFIRMED")))
    .returning()
  if (!used) {
    await log(ticketRow.id, ticketRow.sessionId, "ALREADY_USED")
    return { result: "ALREADY_USED", ticket: await hydrateTicket((await database.query.tickets.findFirst({ where: eq(schema.tickets.id, ticketRow.id) }))!) }
  }
  await log(ticketRow.id, ticketRow.sessionId, "ADMITTED")
  await recordAudit(opts.actor, {
    action: "ticket.admit",
    entityType: "ticket",
    entityId: used.id,
    arenaId: used.arenaId,
    description: `Admitted ${used.ticketNumber} (${detail.customer.name})`,
  })
  return { result: "VALID", ticket: await hydrateTicket(used) }
}

/** Admin cancellation without refund (e.g. no-show policy); refunds go through payments. */
export async function cancelTicket(id: string, reason: string, ctx: { actor: AuditActor }) {
  const database = await db()
  const row = await database.transaction(async (tx) => {
    const [ticket] = await tx.select().from(schema.tickets).where(eq(schema.tickets.id, id)).for("update")
    if (!ticket) throw new AppError("TICKET_NOT_FOUND", "Ticket not found")
    if (ticket.status !== "CONFIRMED") throw new AppError("CONFLICT", `Ticket is already ${ticket.status.toLowerCase()}`)
    return releaseConfirmedTicket(tx, ticket, "CANCELLED", reason)
  })
  await recordAudit(ctx.actor, { action: "ticket.cancel", entityType: "ticket", entityId: id, arenaId: row.arenaId, description: `Cancelled ${row.ticketNumber}`, metadata: { reason } })
  return row
}

/** Shared by cancel and refund: frees the slot and decrements the confirmed counter. */
export async function releaseConfirmedTicket(tx: Transaction, ticket: schema.Ticket, status: "CANCELLED" | "REFUNDED", reason: string) {
  const now = new Date()
  await tx.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.id, ticket.sessionId)).for("update")
  const [updated] = await tx
    .update(schema.tickets)
    .set({ status, cancelledAt: status === "CANCELLED" ? now : ticket.cancelledAt, refundedAt: status === "REFUNDED" ? now : null, paymentStatus: status === "REFUNDED" ? "REFUNDED" : ticket.paymentStatus, updatedAt: now })
    .where(eq(schema.tickets.id, ticket.id))
    .returning()
  await tx
    .update(schema.bookings)
    .set({ status: "CANCELLED", cancelledAt: now, cancellationReason: reason, updatedAt: now })
    .where(eq(schema.bookings.id, ticket.bookingId))
  if (ticket.slotId) {
    await tx.update(schema.sessionSlots).set({ status: "FREE", bookingId: null, updatedAt: now }).where(eq(schema.sessionSlots.id, ticket.slotId))
  }
  await tx
    .update(schema.sessions)
    .set({
      bookedCount: sql`greatest(0, ${schema.sessions.bookedCount} - 1)`,
      status: sql`case when ${schema.sessions.status} = 'FULL' then 'OPEN_FOR_BOOKING'::session_status else ${schema.sessions.status} end`,
      updatedAt: now,
    })
    .where(eq(schema.sessions.id, ticket.sessionId))
  return updated
}

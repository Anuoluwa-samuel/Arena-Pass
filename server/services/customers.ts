import "server-only"
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm"
import { db, schema } from "@/server/db"
import { AppError, notFound } from "@/server/http/errors"
import { revokeAllSessionsFor } from "@/server/auth/session"
import { recordAudit, type AuditActor } from "./audit"

export async function upsertCustomerByEmail(input: { name: string; email: string; phone?: string | null }) {
  const database = await db()
  const email = input.email.trim().toLowerCase()
  const existing = await database.query.customers.findFirst({ where: sql`lower(${schema.customers.email}) = ${email}` })
  if (existing) {
    // Keep the freshest contact details, never downgrade a registered account.
    const [updated] = await database
      .update(schema.customers)
      .set({ name: existing.passwordHash ? existing.name : input.name, phone: input.phone || existing.phone, updatedAt: new Date() })
      .where(eq(schema.customers.id, existing.id))
      .returning()
    return updated
  }
  const [created] = await database.insert(schema.customers).values({ name: input.name, email, phone: input.phone || null }).returning()
  return created
}

/**
 * Customer rows reach the admin UI whole, so credentials are stripped here:
 * the password hash, and the encrypted TOTP secret which is reversible with the
 * app key and so is a live credential, not just a digest.
 */
function sanitizeCustomer(c: schema.Customer) {
  const { passwordHash: _p, totpSecret: _t, ...rest } = c
  void _p
  void _t
  // hasPassword distinguishes a registered account from a guest checkout, which
  // is what the admin list needs — it was reading the hash itself before.
  return { ...rest, hasPassword: Boolean(c.passwordHash), twoFactorEnabled: Boolean(c.totpEnabledAt) }
}

export async function listCustomers(opts: { q?: string; page?: number; pageSize?: number } = {}) {
  const database = await db()
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const where: SQL[] = [isNull(schema.customers.deletedAt)]
  if (opts.q) where.push(or(ilike(schema.customers.name, `%${opts.q}%`), ilike(schema.customers.email, `%${opts.q}%`), ilike(schema.customers.phone, `%${opts.q}%`))!)
  const condition = and(...where)
  const [{ count }] = await database.select({ count: sql<number>`count(*)::int` }).from(schema.customers).where(condition)
  const items = await database
    .select({
      customer: schema.customers,
      ticketCount: sql<number>`(select count(*)::int from ${schema.tickets} t where t.customer_id = ${schema.customers.id})`,
      totalSpent: sql<number>`coalesce((select sum(t.price)::int from ${schema.tickets} t where t.customer_id = ${schema.customers.id} and t.status in ('CONFIRMED','USED')), 0)`,
    })
    .from(schema.customers)
    .where(condition)
    .orderBy(desc(schema.customers.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  return {
    items: items.map((row) => ({ ...row, customer: sanitizeCustomer(row.customer) })),
    meta: { page, pageSize, total: Number(count), totalPages: Math.max(1, Math.ceil(Number(count) / pageSize)) },
  }
}

export async function getCustomerDetail(id: string) {
  const database = await db()
  const customer = await database.query.customers.findFirst({ where: and(eq(schema.customers.id, id), isNull(schema.customers.deletedAt)) })
  if (!customer) throw notFound("Customer")
  const ticketRows = await database
    .select({ ticket: schema.tickets, session: { id: schema.sessions.id, title: schema.sessions.title, startsAt: schema.sessions.startsAt, venue: schema.sessions.venue } })
    .from(schema.tickets)
    .innerJoin(schema.sessions, eq(schema.sessions.id, schema.tickets.sessionId))
    .where(eq(schema.tickets.customerId, id))
    .orderBy(desc(schema.tickets.purchasedAt))
  return { customer: sanitizeCustomer(customer), tickets: ticketRows }
}

export async function updateCustomer(id: string, patch: { name?: string; phone?: string | null; isActive?: boolean }) {
  const database = await db()
  const [row] = await database
    .update(schema.customers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.customers.id, id))
    .returning()
  if (!row) throw notFound("Customer")
  return sanitizeCustomer(row)
}

/**
 * Clears a customer's two-factor enrolment, for the one who has lost both their
 * authenticator and all ten recovery codes. Without this their account is
 * unreachable: unlike an admin, nobody else can act on their behalf, and there
 * is no other way back in.
 *
 * Deliberately not available to the customer themselves — proving who they are
 * is the arena's job here, exactly as it is for the equivalent admin reset.
 */
export async function resetCustomerTwoFactor(id: string, ctx: { actor: AuditActor }) {
  const database = await db()
  const customer = await database.query.customers.findFirst({
    where: and(eq(schema.customers.id, id), isNull(schema.customers.deletedAt)),
  })
  if (!customer) throw notFound("Customer")
  if (!customer.totpEnabledAt) throw new AppError("CONFLICT", `${customer.name} does not have two-factor authentication on`)

  await database
    .update(schema.customers)
    .set({ totpSecret: null, totpEnabledAt: null, updatedAt: new Date() })
    .where(eq(schema.customers.id, id))
  await database
    .delete(schema.twoFactorRecoveryCodes)
    .where(
      and(
        eq(schema.twoFactorRecoveryCodes.principalType, "customer"),
        eq(schema.twoFactorRecoveryCodes.principalId, id)
      )
    )
  // If a lost or stolen phone prompted this, its session should go too.
  await revokeAllSessionsFor("customer", id)
  await recordAudit(ctx.actor, {
    action: "customer.two_factor_reset",
    entityType: "customer",
    entityId: id,
    arenaId: customer.arenaId,
    description: `Reset two-factor authentication for ${customer.name}`,
  })
}

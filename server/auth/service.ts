import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/server/db"
import { AppError } from "@/server/http/errors"
import { hashPassword, verifyPassword } from "./password"
import { createAuthSession, setSessionCookie, clearSessionCookie, revokeSession, loadUserPrincipal } from "./session"
import { createTwoFactorChallenge, isTwoFactorEnabled, setTwoFactorChallengeCookie } from "./two-factor-cookie"
import { recordAudit } from "@/server/services/audit"

interface RequestMeta {
  ip?: string | null
  userAgent?: string | null
}

export async function loginUser(email: string, password: string, meta: RequestMeta) {
  const database = await db()
  const user = await database.query.users.findFirst({
    where: and(sql`lower(${schema.users.email}) = ${email.toLowerCase()}`, isNull(schema.users.deletedAt)),
  })
  // Always run the hash comparison so timing does not reveal whether the email exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? "scrypt$16384$8$1$AAAA$AAAA")
  if (!user || !valid) throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password")
  if (!user.isActive) throw new AppError("ACCOUNT_DISABLED", "This account has been disabled")

  // Password accepted, but with 2FA on no session exists until the code is right.
  if (await isTwoFactorEnabled("user", user.id)) {
    await setTwoFactorChallengeCookie("user", await createTwoFactorChallenge("user", user.id, meta))
    return { twoFactorRequired: true as const, user: null }
  }

  const { token, session, ttl } = await createAuthSession("user", user.id, meta)
  await setSessionCookie("user", token, ttl)
  await database.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id))
  await recordAudit(
    { type: "user", id: user.id, name: user.name, ip: meta.ip },
    { action: "auth.login", description: `${user.name} signed in`, arenaId: user.arenaId }
  )
  return { twoFactorRequired: false as const, user: await loadUserPrincipal(user.id, session.id) }
}

/** Finishes an admin sign-in that was held at the second factor. */
export async function completeUserLogin(userId: string, meta: RequestMeta) {
  const database = await db()
  const user = await database.query.users.findFirst({
    where: and(eq(schema.users.id, userId), eq(schema.users.isActive, true), isNull(schema.users.deletedAt)),
  })
  if (!user) throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password")
  const { token, session, ttl } = await createAuthSession("user", user.id, meta)
  await setSessionCookie("user", token, ttl)
  await database.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id))
  await recordAudit(
    { type: "user", id: user.id, name: user.name, ip: meta.ip },
    { action: "auth.login", description: `${user.name} signed in with two-factor authentication`, arenaId: user.arenaId }
  )
  return loadUserPrincipal(user.id, session.id)
}

export async function logoutUser(sessionId: string, actor: { id: string; name: string; arenaId: string | null; ip?: string | null }) {
  await revokeSession(sessionId)
  await clearSessionCookie("user")
  await recordAudit(
    { type: "user", id: actor.id, name: actor.name, ip: actor.ip },
    { action: "auth.logout", description: `${actor.name} signed out`, arenaId: actor.arenaId }
  )
}

export async function signupCustomer(
  input: { name: string; email: string; phone?: string; password: string },
  meta: RequestMeta
) {
  const database = await db()
  const existing = await database.query.customers.findFirst({
    where: sql`lower(${schema.customers.email}) = ${input.email.toLowerCase()}`,
  })
  let customer: schema.Customer
  if (existing && existing.passwordHash) {
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists")
  } else if (existing) {
    // Guest checkout customer upgrading to a full account.
    ;[customer] = await database
      .update(schema.customers)
      .set({ name: input.name, phone: input.phone ?? existing.phone, passwordHash: await hashPassword(input.password), updatedAt: new Date() })
      .where(eq(schema.customers.id, existing.id))
      .returning()
  } else {
    ;[customer] = await database
      .insert(schema.customers)
      .values({ name: input.name, email: input.email.toLowerCase(), phone: input.phone ?? null, passwordHash: await hashPassword(input.password) })
      .returning()
  }
  const { token, ttl } = await createAuthSession("customer", customer.id, meta)
  await setSessionCookie("customer", token, ttl)
  return customer
}

export async function loginCustomer(email: string, password: string, meta: RequestMeta) {
  const database = await db()
  const customer = await database.query.customers.findFirst({
    where: and(sql`lower(${schema.customers.email}) = ${email.toLowerCase()}`, isNull(schema.customers.deletedAt)),
  })
  const valid = await verifyPassword(password, customer?.passwordHash ?? "scrypt$16384$8$1$AAAA$AAAA")
  if (!customer || !valid) throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password")
  if (!customer.isActive) throw new AppError("ACCOUNT_DISABLED", "This account has been disabled")
  if (await isTwoFactorEnabled("customer", customer.id)) {
    await setTwoFactorChallengeCookie("customer", await createTwoFactorChallenge("customer", customer.id, meta))
    return { twoFactorRequired: true as const, customer: null }
  }
  const { token, ttl } = await createAuthSession("customer", customer.id, meta)
  await setSessionCookie("customer", token, ttl)
  await database.update(schema.customers).set({ lastLoginAt: new Date() }).where(eq(schema.customers.id, customer.id))
  return { twoFactorRequired: false as const, customer }
}

/** Finishes a customer sign-in that was held at the second factor. */
export async function completeCustomerLogin(customerId: string, meta: RequestMeta) {
  const database = await db()
  const customer = await database.query.customers.findFirst({
    where: and(eq(schema.customers.id, customerId), eq(schema.customers.isActive, true), isNull(schema.customers.deletedAt)),
  })
  if (!customer) throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password")
  const { token, ttl } = await createAuthSession("customer", customer.id, meta)
  await setSessionCookie("customer", token, ttl)
  await database.update(schema.customers).set({ lastLoginAt: new Date() }).where(eq(schema.customers.id, customer.id))
  return customer
}

export async function logoutCustomer(sessionId: string) {
  await revokeSession(sessionId)
  await clearSessionCookie("customer")
}

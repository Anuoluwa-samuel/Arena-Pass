import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { and, eq, gt, isNull } from "drizzle-orm"
import { db, schema } from "@/server/db"
import { env } from "@/server/env"
import { randomToken, sha256 } from "./tokens"
import type { Permission } from "@/lib/domain/constants"

export const ADMIN_COOKIE = "ap_admin_session"
export const CUSTOMER_COOKIE = "ap_customer_session"

const ADMIN_TTL_MS = 12 * 60 * 60 * 1000 // 12h
const CUSTOMER_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30d

/**
 * Admin sessions also end after this long without a request. The back office
 * shows takings, refunds and customer data, and is often left open on a shared
 * screen, so the 12h ceiling alone is too generous. Customers are deliberately
 * exempt: a booking app that signs players out mid-visit costs bookings.
 */
const ADMIN_IDLE_MS = 30 * 60 * 1000 // 30min
/** Don't write lastSeenAt on every single request — once a minute is enough to enforce the above. */
const LAST_SEEN_WRITE_INTERVAL_MS = 60 * 1000

export const IDLE_TIMEOUT_REASON = "idle_timeout"
export const ADMIN_IDLE_TIMEOUT_MINUTES = ADMIN_IDLE_MS / 60000

type PrincipalType = "user" | "customer"

export interface AuthenticatedUser {
  id: string
  arenaId: string | null
  email: string
  name: string
  roleKey: schema.Role["key"]
  roleName: string
  permissions: Permission[]
  sessionId: string
}

export interface AuthenticatedCustomer {
  id: string
  email: string
  name: string
  username: string | null
  phone: string | null
  sessionId: string
}

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.isProd,
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  }
}

/** Creates a DB-backed session and returns the raw token (only ever stored hashed). */
export async function createAuthSession(
  principalType: PrincipalType,
  principalId: string,
  meta: { ip?: string | null; userAgent?: string | null }
) {
  const database = await db()
  const token = randomToken(32)
  const ttl = principalType === "user" ? ADMIN_TTL_MS : CUSTOMER_TTL_MS
  const [row] = await database
    .insert(schema.authSessions)
    .values({
      principalType,
      principalId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + ttl),
      ipAddress: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 500) ?? null,
    })
    .returning()
  return { token, session: row, ttl }
}

export async function setSessionCookie(principalType: PrincipalType, token: string, ttl: number) {
  const store = await cookies()
  store.set(principalType === "user" ? ADMIN_COOKIE : CUSTOMER_COOKIE, token, cookieOptions(ttl))
}

export async function clearSessionCookie(principalType: PrincipalType) {
  const store = await cookies()
  store.set(principalType === "user" ? ADMIN_COOKIE : CUSTOMER_COOKIE, "", { ...cookieOptions(0), maxAge: 0 })
}

export async function revokeSession(sessionId: string, reason?: string) {
  const database = await db()
  await database
    .update(schema.authSessions)
    .set({ revokedAt: new Date(), revokedReason: reason ?? null })
    .where(eq(schema.authSessions.id, sessionId))
}

export async function revokeAllSessionsFor(principalType: PrincipalType, principalId: string) {
  const database = await db()
  await database
    .update(schema.authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.authSessions.principalType, principalType), eq(schema.authSessions.principalId, principalId)))
}

/**
 * Resolves a live session and, for admins, applies the idle timeout. This is the
 * single chokepoint every authenticated request passes through, so enforcing it
 * here means no route can forget to.
 */
async function findLiveSession(principalType: PrincipalType, token: string | undefined) {
  if (!token) return null
  const database = await db()
  const session = await database.query.authSessions.findFirst({
    where: and(
      eq(schema.authSessions.tokenHash, sha256(token)),
      eq(schema.authSessions.principalType, principalType),
      isNull(schema.authSessions.revokedAt),
      gt(schema.authSessions.expiresAt, new Date())
    ),
  })
  if (!session) return null
  if (principalType !== "user") return session

  const now = Date.now()
  const idleFor = now - session.lastSeenAt.getTime()
  if (idleFor > ADMIN_IDLE_MS) {
    // Revoked rather than just ignored, so the row records why and the sign-in
    // page can say "signed out for inactivity" instead of a bare prompt.
    await revokeSession(session.id, IDLE_TIMEOUT_REASON)
    return null
  }
  if (idleFor > LAST_SEEN_WRITE_INTERVAL_MS) {
    await database.update(schema.authSessions).set({ lastSeenAt: new Date(now) }).where(eq(schema.authSessions.id, session.id))
  }
  return session
}

/** True when this admin session ended because it went idle, for the sign-in page's message. */
export async function wasIdleTimeout(token: string | undefined) {
  if (!token) return false
  const database = await db()
  const session = await database.query.authSessions.findFirst({
    where: and(eq(schema.authSessions.tokenHash, sha256(token)), eq(schema.authSessions.principalType, "user")),
  })
  return session?.revokedReason === IDLE_TIMEOUT_REASON
}

/** Resolves the admin user for the current request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const store = await cookies()
  const session = await findLiveSession("user", store.get(ADMIN_COOKIE)?.value)
  if (!session) return null
  return loadUserPrincipal(session.principalId, session.id)
})

export async function loadUserPrincipal(userId: string, sessionId: string): Promise<AuthenticatedUser | null> {
  const database = await db()
  const user = await database.query.users.findFirst({
    where: and(eq(schema.users.id, userId), eq(schema.users.isActive, true), isNull(schema.users.deletedAt)),
  })
  if (!user) return null
  const role = await database.query.roles.findFirst({ where: eq(schema.roles.id, user.roleId) })
  if (!role) return null
  const perms = await database.query.rolePermissions.findMany({ where: eq(schema.rolePermissions.roleId, role.id) })
  return {
    id: user.id,
    arenaId: user.arenaId,
    email: user.email,
    name: user.name,
    roleKey: role.key,
    roleName: role.name,
    permissions: perms.map((p) => p.permission as Permission),
    sessionId,
  }
}

export const getCurrentCustomer = cache(async (): Promise<AuthenticatedCustomer | null> => {
  const store = await cookies()
  const session = await findLiveSession("customer", store.get(CUSTOMER_COOKIE)?.value)
  if (!session) return null
  const database = await db()
  const customer = await database.query.customers.findFirst({
    where: and(eq(schema.customers.id, session.principalId), eq(schema.customers.isActive, true), isNull(schema.customers.deletedAt)),
  })
  if (!customer) return null
  return { id: customer.id, email: customer.email, name: customer.name, username: customer.username, phone: customer.phone, sessionId: session.id }
})

/** Token-based variant for route handlers that receive the cookie header directly (e.g. tests). */
export async function getUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  const token = readCookie(req, ADMIN_COOKIE)
  const session = await findLiveSession("user", token)
  if (!session) return null
  return loadUserPrincipal(session.principalId, session.id)
}

export function readCookie(req: Request, name: string) {
  const header = req.headers.get("cookie") ?? ""
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return decodeURIComponent(rest.join("="))
  }
  return undefined
}

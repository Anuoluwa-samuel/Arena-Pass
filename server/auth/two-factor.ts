import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import QRCode from "qrcode"
import { db, schema } from "@/server/db"
import { AppError } from "@/server/http/errors"
import { randomToken, sha256 } from "./tokens"
import {
  decryptSecretOrNull,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  normaliseRecoveryCode,
  totpUri,
  verifyTotp,
} from "./totp"

/** A password has been accepted; this is how long the second step stays open. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000

export type PrincipalType = "user" | "customer"

/**
 * Admin users and customers are separate tables with identical 2FA columns, so
 * every function here takes the principal type and picks the table once. The
 * alternative — duplicating each operation per table — is where the two
 * implementations would drift apart.
 */
function tableFor(principalType: PrincipalType) {
  return principalType === "user" ? schema.users : schema.customers
}

type TotpPrincipal = { id: string; email: string; totpSecret: string | null; totpEnabledAt: Date | null }

async function loadPrincipal(principalType: PrincipalType, principalId: string): Promise<TotpPrincipal> {
  const database = await db()
  // Branched rather than indexed: Drizzle types each table's query builder
  // separately, so a dynamic key yields a union that TypeScript won't call.
  const row =
    principalType === "user"
      ? await database.query.users.findFirst({
          where: and(eq(schema.users.id, principalId), isNull(schema.users.deletedAt)),
        })
      : await database.query.customers.findFirst({
          where: and(eq(schema.customers.id, principalId), isNull(schema.customers.deletedAt)),
        })
  if (!row) throw new AppError("NOT_FOUND", "Account not found")
  return row
}

export async function twoFactorStatus(principalType: PrincipalType, principalId: string) {
  const principal = await loadPrincipal(principalType, principalId)
  const database = await db()
  const codes = principal.totpEnabledAt
    ? await database.query.twoFactorRecoveryCodes.findMany({
        where: and(
          eq(schema.twoFactorRecoveryCodes.principalType, principalType),
          eq(schema.twoFactorRecoveryCodes.principalId, principalId),
          isNull(schema.twoFactorRecoveryCodes.usedAt)
        ),
      })
    : []
  return { enabled: Boolean(principal.totpEnabledAt), enabledAt: principal.totpEnabledAt, recoveryCodesLeft: codes.length }
}

/**
 * Step one of enrolment: mint a secret and hand back the QR code. The secret is
 * stored immediately but `totpEnabledAt` stays null, so nothing is enforced at
 * sign-in until a code proves the authenticator actually holds it. Starting
 * again simply overwrites the unconfirmed secret.
 */
export async function beginTwoFactorEnrolment(principalType: PrincipalType, principalId: string) {
  const principal = await loadPrincipal(principalType, principalId)
  if (principal.totpEnabledAt) throw new AppError("CONFLICT", "Two-factor authentication is already on for this account")
  const database = await db()
  const table = tableFor(principalType)
  const secret = generateTotpSecret()
  await database.update(table).set({ totpSecret: encryptSecret(secret), updatedAt: new Date() }).where(eq(table.id, principalId))
  const uri = totpUri(secret, principal.email)
  return {
    secret,
    uri,
    // Rendered server-side so the secret never has to travel to a client-side QR library.
    qrImage: await QRCode.toDataURL(uri, { width: 240, margin: 1 }),
  }
}

/**
 * Step two: a correct code confirms the authenticator is set up, switches
 * enforcement on and returns the recovery codes. They are shown exactly once —
 * only their hashes are kept.
 */
export async function confirmTwoFactorEnrolment(principalType: PrincipalType, principalId: string, code: string) {
  const principal = await loadPrincipal(principalType, principalId)
  if (principal.totpEnabledAt) throw new AppError("CONFLICT", "Two-factor authentication is already on for this account")
  if (!principal.totpSecret) throw new AppError("CONFLICT", "Start the setup again to get a fresh QR code")
  const pending = decryptSecretOrNull(principal.totpSecret)
  // Only reachable if the key changed between the QR being shown and the code
  // being typed. Nothing is enabled yet, so a fresh QR fixes it.
  if (!pending) throw new AppError("CONFLICT", "Start the setup again to get a fresh QR code")
  if (!verifyTotp(pending, code)) {
    throw new AppError("INVALID_CREDENTIALS", "That code is not right. Check your authenticator and try again.")
  }
  const database = await db()
  const table = tableFor(principalType)
  await database.update(table).set({ totpEnabledAt: new Date(), updatedAt: new Date() }).where(eq(table.id, principalId))
  return { recoveryCodes: await replaceRecoveryCodes(principalType, principalId) }
}

/** Issues a fresh set and retires any earlier ones, so old printouts stop working. */
export async function replaceRecoveryCodes(principalType: PrincipalType, principalId: string) {
  const database = await db()
  await database
    .delete(schema.twoFactorRecoveryCodes)
    .where(
      and(
        eq(schema.twoFactorRecoveryCodes.principalType, principalType),
        eq(schema.twoFactorRecoveryCodes.principalId, principalId)
      )
    )
  const codes = generateRecoveryCodes()
  await database.insert(schema.twoFactorRecoveryCodes).values(
    codes.map((c) => ({ principalType, principalId, codeHash: sha256(normaliseRecoveryCode(c)) }))
  )
  return codes
}

/** Turns 2FA off and clears the secret and every unused recovery code with it. */
export async function disableTwoFactor(principalType: PrincipalType, principalId: string) {
  const database = await db()
  const table = tableFor(principalType)
  await database
    .update(table)
    .set({ totpSecret: null, totpEnabledAt: null, updatedAt: new Date() })
    .where(eq(table.id, principalId))
  await database
    .delete(schema.twoFactorRecoveryCodes)
    .where(
      and(
        eq(schema.twoFactorRecoveryCodes.principalType, principalType),
        eq(schema.twoFactorRecoveryCodes.principalId, principalId)
      )
    )
}

export async function isTwoFactorEnabled(principalType: PrincipalType, principalId: string) {
  const principal = await loadPrincipal(principalType, principalId)
  return Boolean(principal.totpEnabledAt && principal.totpSecret)
}

// --- the sign-in challenge ----------------------------------------------------------

/** Parks a verified password behind a short-lived, single-use token. */
export async function createTwoFactorChallenge(
  principalType: PrincipalType,
  principalId: string,
  meta: { ip?: string | null; userAgent?: string | null }
) {
  const database = await db()
  const token = randomToken(32)
  await database.insert(schema.twoFactorChallenges).values({
    principalType,
    principalId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    ipAddress: meta.ip ?? null,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
  })
  return { token, ttlMs: CHALLENGE_TTL_MS }
}

/**
 * Checks the code against the authenticator first, then the recovery codes, and
 * consumes the challenge either way on success. A used recovery code is marked
 * rather than deleted, so the count shown in the UI stays honest about how many
 * are left.
 */
export async function consumeTwoFactorChallenge(
  principalType: PrincipalType,
  token: string | undefined,
  code: string
): Promise<{ principalId: string; usedRecoveryCode: boolean }> {
  if (!token) throw new AppError("UNAUTHORIZED", "Your sign-in has expired. Please enter your password again.")
  const database = await db()
  const challenge = await database.query.twoFactorChallenges.findFirst({
    where: and(
      eq(schema.twoFactorChallenges.tokenHash, sha256(token)),
      eq(schema.twoFactorChallenges.principalType, principalType),
      isNull(schema.twoFactorChallenges.consumedAt)
    ),
  })
  if (!challenge || challenge.expiresAt <= new Date()) {
    throw new AppError("UNAUTHORIZED", "Your sign-in has expired. Please enter your password again.")
  }

  const principal = await loadPrincipal(principalType, challenge.principalId)
  if (!principal.totpSecret || !principal.totpEnabledAt) throw new AppError("UNAUTHORIZED", "Two-factor authentication is not set up")

  // Null when the stored secret can no longer be decrypted. That must not throw
  // here: the recovery codes below are hashed, still valid, and are the whole
  // point of having a fallback.
  const secret = decryptSecretOrNull(principal.totpSecret)
  let usedRecoveryCode = false
  if (!secret || !verifyTotp(secret, code)) {
    const hash = sha256(normaliseRecoveryCode(code))
    const recovery = await database.query.twoFactorRecoveryCodes.findFirst({
      where: and(
        eq(schema.twoFactorRecoveryCodes.principalType, principalType),
        eq(schema.twoFactorRecoveryCodes.principalId, challenge.principalId),
        eq(schema.twoFactorRecoveryCodes.codeHash, hash),
        isNull(schema.twoFactorRecoveryCodes.usedAt)
      ),
    })
    if (!recovery) throw new AppError("INVALID_CREDENTIALS", "That code is not right")
    // Conditional update so two parallel submissions of the same code can't both win.
    const claimed = await database
      .update(schema.twoFactorRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.twoFactorRecoveryCodes.id, recovery.id), isNull(schema.twoFactorRecoveryCodes.usedAt)))
      .returning()
    if (claimed.length === 0) throw new AppError("INVALID_CREDENTIALS", "That code is not right")
    usedRecoveryCode = true
  }

  await database
    .update(schema.twoFactorChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(schema.twoFactorChallenges.id, challenge.id))
  return { principalId: challenge.principalId, usedRecoveryCode }
}

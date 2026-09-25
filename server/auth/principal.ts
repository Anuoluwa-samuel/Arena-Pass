import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import { db, schema } from "@/server/db"
import { AppError } from "@/server/http/errors"
import { getCurrentCustomer, getCurrentUser } from "./session"
import { decryptSecretOrNull, normaliseRecoveryCode, verifyTotp } from "./totp"
import { sha256 } from "./tokens"
import type { PrincipalType } from "./two-factor"

/**
 * Whoever is signed in on this request. The 2FA settings endpoints are shared by
 * the admin back office and customer accounts, so they resolve the caller once
 * here rather than each route knowing which kind of principal it serves. An
 * admin session wins if somehow both cookies are present.
 */
export async function requirePrincipal(): Promise<{ principalType: PrincipalType; id: string; email: string; name: string }> {
  const user = await getCurrentUser()
  if (user) return { principalType: "user", id: user.id, email: user.email, name: user.name }
  const customer = await getCurrentCustomer()
  if (customer) return { principalType: "customer", id: customer.id, email: customer.email, name: customer.name }
  throw new AppError("UNAUTHORIZED", "Please sign in")
}

/**
 * Re-checks a code for someone already signed in, before a change that weakens
 * their account (turning 2FA off, replacing recovery codes). Accepts an
 * authenticator code or an unused recovery code, and burns the recovery code if
 * that is what was used.
 */
export async function verifyCurrentPrincipalCode(principalType: PrincipalType, principalId: string, code: string) {
  const database = await db()
  const principal =
    principalType === "user"
      ? await database.query.users.findFirst({
          where: and(eq(schema.users.id, principalId), isNull(schema.users.deletedAt)),
        })
      : await database.query.customers.findFirst({
          where: and(eq(schema.customers.id, principalId), isNull(schema.customers.deletedAt)),
        })
  if (!principal?.totpSecret) throw new AppError("CONFLICT", "Two-factor authentication is not set up")
  // An unreadable secret still leaves recovery codes, which are enough to turn
  // 2FA off and enrol again — the way out if the stored secret is unusable.
  const secret = decryptSecretOrNull(principal.totpSecret)
  if (secret && verifyTotp(secret, code)) return

  const hash = sha256(normaliseRecoveryCode(code))
  const recovery = await database.query.twoFactorRecoveryCodes.findFirst({
    where: and(
      eq(schema.twoFactorRecoveryCodes.principalType, principalType),
      eq(schema.twoFactorRecoveryCodes.principalId, principalId),
      eq(schema.twoFactorRecoveryCodes.codeHash, hash),
      isNull(schema.twoFactorRecoveryCodes.usedAt)
    ),
  })
  if (!recovery) throw new AppError("INVALID_CREDENTIALS", "That code is not right")
  const claimed = await database
    .update(schema.twoFactorRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.twoFactorRecoveryCodes.id, recovery.id), isNull(schema.twoFactorRecoveryCodes.usedAt)))
    .returning()
  if (claimed.length === 0) throw new AppError("INVALID_CREDENTIALS", "That code is not right")
}

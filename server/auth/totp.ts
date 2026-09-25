import "server-only"
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto"
import { env } from "@/server/env"

/**
 * RFC 6238 time-based one-time passwords, on Node's crypto only — no new
 * dependency. Authenticator apps (Google Authenticator, Authy, 1Password) all
 * speak the same 30-second / 6-digit / SHA-1 dialect, so those parameters are
 * fixed rather than configurable: changing one would break every enrolled app.
 */
export const TOTP_DIGITS = 6
export const TOTP_PERIOD_SECONDS = 30
/** Accept the neighbouring steps too, so a phone clock drifting by up to 30s still works. */
const TOTP_WINDOW = 1

// --- base32 (RFC 4648, no padding) — the encoding every authenticator expects -------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function base32Encode(buf: Buffer) {
  let bits = 0
  let value = 0
  let out = ""
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "")
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx === -1) throw new Error("Invalid base32 character in TOTP secret")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** A fresh 20-byte (160-bit) secret, the size RFC 4226 recommends for SHA-1 HMAC. */
export function generateTotpSecret() {
  return base32Encode(randomBytes(20))
}

function codeForStep(secret: string, step: number) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest()
  // Dynamic truncation (RFC 4226 §5.3): the low nibble of the last byte picks the offset.
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]
  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0")
}

/** The code an authenticator would be showing right now. Exported for tests. */
export function currentTotpCode(secret: string, at: Date = new Date()) {
  return codeForStep(secret, Math.floor(at.getTime() / 1000 / TOTP_PERIOD_SECONDS))
}

/**
 * True when `code` matches the secret for the current step or an adjacent one.
 * Every candidate is compared in constant time, and the loop always runs to
 * completion, so a timing observer learns nothing about which step matched.
 */
export function verifyTotp(secret: string, code: string, at: Date = new Date()) {
  const cleaned = code.replace(/\s/g, "")
  if (!/^\d{6}$/.test(cleaned)) return false
  const step = Math.floor(at.getTime() / 1000 / TOTP_PERIOD_SECONDS)
  let matched = false
  for (let drift = -TOTP_WINDOW; drift <= TOTP_WINDOW; drift++) {
    const expected = Buffer.from(codeForStep(secret, step + drift))
    const given = Buffer.from(cleaned)
    if (expected.length === given.length && timingSafeEqual(expected, given)) matched = true
  }
  return matched
}

/**
 * The `otpauth://` URI an authenticator reads from the enrolment QR code. The
 * issuer appears twice by convention: as a label prefix for apps that only read
 * the label, and as a parameter for those that read both.
 */
export function totpUri(secret: string, account: string) {
  const issuer = env.APP_NAME
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

// --- secret storage ----------------------------------------------------------------
/**
 * TOTP secrets, unlike passwords, have to be recoverable to verify a code, so
 * they are encrypted rather than hashed. The key is derived from SESSION_SECRET
 * via HKDF with a distinct info string, so the stored ciphertext is useless to
 * anyone holding only a database dump.
 *
 * Consequence worth knowing before rotating: SESSION_SECRET was previously safe
 * to rotate (sessions are database-backed). It now also protects these secrets,
 * so rotating it leaves enrolled users unable to pass 2FA and they must
 * re-enrol. See docs/DEPLOYMENT.md.
 */
function encryptionKey() {
  return Buffer.from(hkdfSync("sha256", Buffer.from(env.SESSION_SECRET), Buffer.alloc(0), Buffer.from("arena-pass:totp:v1"), 32))
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  // iv.tag.ciphertext, each base64url, so the whole thing stays one text column.
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".")
}

export function decryptSecret(stored: string) {
  const [iv, tag, data] = stored.split(".")
  if (!iv || !tag || !data) throw new Error("Malformed encrypted TOTP secret")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8")
}

/**
 * Same, but returns null instead of throwing when the stored value cannot be
 * read — a rotated SESSION_SECRET, a bad restore, a truncated column.
 *
 * Callers must use this on the sign-in path. Recovery codes are hashed, not
 * encrypted, so they stay valid even when the secret does not: letting a
 * decryption failure throw would take the recovery path down with it and lock
 * the account permanently, which is exactly what recovery codes exist to
 * prevent.
 */
export function decryptSecretOrNull(stored: string | null) {
  if (!stored) return null
  try {
    return decryptSecret(stored)
  } catch {
    return null
  }
}

// --- recovery codes ----------------------------------------------------------------
export const RECOVERY_CODE_COUNT = 10

/**
 * Ten single-use codes, shown once at enrolment, for the day the phone is lost.
 * Crockford-ish base32 without look-alike characters, grouped for legibility.
 */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789"
  return Array.from({ length: count }, () => {
    const chars = Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("")
    return `${chars.slice(0, 5)}-${chars.slice(5)}`
  })
}

/** Recovery codes are compared case-insensitively and ignoring the grouping dash. */
export function normaliseRecoveryCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

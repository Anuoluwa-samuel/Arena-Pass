import { describe, it, expect } from "vitest"
import {
  base32Decode,
  base32Encode,
  currentTotpCode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  normaliseRecoveryCode,
  totpUri,
  verifyTotp,
  TOTP_PERIOD_SECONDS,
} from "@/server/auth/totp"

describe("base32", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = Buffer.from([0, 1, 127, 128, 255, 42, 17])
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true)
  })

  it("matches the RFC 4648 test vectors an authenticator would use", () => {
    expect(base32Encode(Buffer.from("foobar"))).toBe("MZXW6YTBOI")
    expect(base32Decode("MZXW6YTBOI").toString()).toBe("foobar")
  })

  it("tolerates lowercase, padding and whitespace when reading a hand-typed secret", () => {
    expect(base32Decode("mzxw 6ytb oi==").toString()).toBe("foobar")
  })

  it("rejects characters outside the alphabet", () => {
    expect(() => base32Decode("MZXW6YTB01")).toThrow(/Invalid base32/)
  })
})

describe("TOTP codes", () => {
  // RFC 6238 vector: the ASCII secret "12345678901234567890" at T=59 gives 287082.
  const rfcSecret = base32Encode(Buffer.from("12345678901234567890"))

  it("reproduces the RFC 6238 reference code", () => {
    expect(currentTotpCode(rfcSecret, new Date(59 * 1000))).toBe("287082")
  })

  it("issues six digits", () => {
    expect(currentTotpCode(generateTotpSecret())).toMatch(/^\d{6}$/)
  })

  it("accepts the code for the current step", () => {
    const secret = generateTotpSecret()
    expect(verifyTotp(secret, currentTotpCode(secret))).toBe(true)
  })

  it("accepts one step either side, so a slightly wrong phone clock still works", () => {
    const secret = generateTotpSecret()
    const now = new Date()
    const back = new Date(now.getTime() - TOTP_PERIOD_SECONDS * 1000)
    const forward = new Date(now.getTime() + TOTP_PERIOD_SECONDS * 1000)
    expect(verifyTotp(secret, currentTotpCode(secret, back), now)).toBe(true)
    expect(verifyTotp(secret, currentTotpCode(secret, forward), now)).toBe(true)
  })

  it("rejects a code two steps away", () => {
    const secret = generateTotpSecret()
    const now = new Date()
    const stale = new Date(now.getTime() - 2 * TOTP_PERIOD_SECONDS * 1000)
    expect(verifyTotp(secret, currentTotpCode(secret, stale), now)).toBe(false)
  })

  it("rejects another account's code", () => {
    const now = new Date()
    expect(verifyTotp(generateTotpSecret(), currentTotpCode(generateTotpSecret(), now), now)).toBe(false)
  })

  it("rejects malformed input rather than throwing", () => {
    const secret = generateTotpSecret()
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34 56 78"]) {
      expect(verifyTotp(secret, bad)).toBe(false)
    }
  })

  it("ignores whitespace inside a pasted code", () => {
    const secret = generateTotpSecret()
    const code = currentTotpCode(secret)
    expect(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(true)
  })
})

describe("otpauth URI", () => {
  it("carries the parameters an authenticator needs", () => {
    const uri = totpUri("JBSWY3DPEHPK3PXP", "player@example.com")
    expect(uri.startsWith("otpauth://totp/")).toBe(true)
    const params = new URL(uri).searchParams
    expect(params.get("secret")).toBe("JBSWY3DPEHPK3PXP")
    expect(params.get("digits")).toBe("6")
    expect(params.get("period")).toBe("30")
    expect(params.get("algorithm")).toBe("SHA1")
    expect(decodeURIComponent(uri)).toContain("player@example.com")
  })
})

describe("secret encryption", () => {
  it("round-trips a secret", () => {
    const secret = generateTotpSecret()
    expect(decryptSecret(encryptSecret(secret))).toBe(secret)
  })

  it("never stores the secret in the clear", () => {
    const secret = generateTotpSecret()
    expect(encryptSecret(secret)).not.toContain(secret)
  })

  it("uses a fresh nonce each time, so the same secret encrypts differently", () => {
    const secret = generateTotpSecret()
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret))
  })

  it("refuses tampered ciphertext instead of returning garbage", () => {
    const stored = encryptSecret(generateTotpSecret())
    const [iv, tag, data] = stored.split(".")
    const flipped = Buffer.from(data, "base64url")
    flipped[0] ^= 0xff
    expect(() => decryptSecret([iv, tag, flipped.toString("base64url")].join("."))).toThrow()
  })

  it("rejects a malformed stored value", () => {
    expect(() => decryptSecret("not-a-real-ciphertext")).toThrow(/Malformed/)
  })
})

describe("recovery codes", () => {
  it("issues ten distinct codes", () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
  })

  it("avoids characters that are easy to misread", () => {
    for (const code of generateRecoveryCodes()) {
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTVWXYZ23456789]{5}$/)
    }
  })

  it("normalises case and the grouping dash, so a retyped code still matches", () => {
    const [code] = generateRecoveryCodes(1)
    expect(normaliseRecoveryCode(code.toLowerCase())).toBe(normaliseRecoveryCode(code))
    expect(normaliseRecoveryCode(code.replace("-", " "))).toBe(normaliseRecoveryCode(code))
    expect(normaliseRecoveryCode(code)).toHaveLength(10)
  })
})

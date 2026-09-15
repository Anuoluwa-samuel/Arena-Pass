import { describe, it, expect } from "vitest"
import { createHash } from "node:crypto"
import { safeNextPath } from "@/lib/safe-next"
import { pkceChallenge, verifyGoogleIdToken } from "@/server/auth/google"

const CLIENT_ID = "client-123.apps.googleusercontent.com"
const NONCE = "nonce-abcdefghijklmnopqrstuvwxyz"
const NOW = Date.UTC(2026, 8, 15, 12, 0, 0)

/** Unsigned JWT with the given claims; signature is irrelevant to claim validation. */
function idToken(overrides: Record<string, unknown> = {}) {
  const claims = {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "google-sub-1",
    email: "Ada@Example.com",
    email_verified: true,
    name: "Ada Okafor",
    nonce: NONCE,
    exp: Math.floor(NOW / 1000) + 600,
    ...overrides,
  }
  return ["eyJhbGciOiJSUzI1NiJ9", Buffer.from(JSON.stringify(claims)).toString("base64url"), "sig"].join(".")
}
const verify = (token: string) => verifyGoogleIdToken(token, { clientId: CLIENT_ID, nonce: NONCE, now: NOW })

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/account/tickets")).toBe("/account/tickets")
    expect(safeNextPath("/checkout/abc?x=1#y")).toBe("/checkout/abc?x=1#y")
  })
  it("rejects anything that could leave the site", () => {
    const tab = String.fromCharCode(9)
    const newline = String.fromCharCode(10)
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", `/${tab}/evil.com`, `/${newline}/evil.com`, "/a\\b"]) {
      expect(safeNextPath(bad, "/fallback")).toBe("/fallback")
    }
    expect(safeNextPath(null)).toBe("/account/tickets")
  })
})

describe("Google PKCE", () => {
  it("derives the S256 challenge as base64url(sha256(verifier))", () => {
    const verifier = "test-verifier-value"
    expect(pkceChallenge(verifier)).toBe(createHash("sha256").update(verifier).digest("base64url"))
    expect(pkceChallenge(verifier)).not.toMatch(/[+/=]/)
  })
})

describe("verifyGoogleIdToken", () => {
  it("accepts a valid token and normalises the email", () => {
    expect(verify(idToken())).toEqual({ sub: "google-sub-1", email: "ada@example.com", name: "Ada Okafor" })
  })
  it("accepts the legacy issuer and string email_verified", () => {
    expect(verify(idToken({ iss: "accounts.google.com", email_verified: "true" })).sub).toBe("google-sub-1")
  })
  it("falls back to the email local part when there is no name", () => {
    expect(verify(idToken({ name: undefined })).name).toBe("ada")
  })
  it.each([
    ["wrong issuer", { iss: "https://evil.example" }],
    ["wrong audience", { aud: "someone-else" }],
    ["expired", { exp: Math.floor(NOW / 1000) - 3600 }],
    ["nonce mismatch", { nonce: "replayed-nonce-zzzzzzzzzzzzzzzzzzzz" }],
    ["missing sub", { sub: "" }],
    ["unverified email", { email_verified: false }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => verify(idToken(overrides))).toThrowError(expect.objectContaining({ code: "OAUTH_FAILED" }))
  })
  it("rejects a malformed token", () => {
    expect(() => verify("not-a-jwt")).toThrowError(expect.objectContaining({ code: "OAUTH_FAILED" }))
  })
})

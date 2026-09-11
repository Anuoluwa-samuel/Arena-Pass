import { describe, it, expect } from "vitest"
import { formatMoney, initials } from "@/lib/format"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import { buildQrPayload, parseQrPayload } from "@/server/services/tickets"
import { AppError, isUniqueViolation, toAppErrorForTest } from "./helpers"

describe("money formatting", () => {
  it("formats minor units in naira", () => {
    expect(formatMoney(500_000, "NGN")).toMatch(/₦\s?5,000/)
    expect(formatMoney(123_450, "NGN")).toMatch(/1,234\.50/)
  })
  it("falls back for unknown currencies", () => expect(formatMoney(1000, "NOPE")).toContain("NOPE"))
  it("builds initials", () => expect(initials("Ada Okafor")).toBe("AO"))
})

describe("passwords", () => {
  it("hashes with scrypt and verifies", async () => {
    const hash = await hashPassword("correct horse battery staple")
    expect(hash.startsWith("scrypt$")).toBe(true)
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true)
    expect(await verifyPassword("wrong", hash)).toBe(false)
    expect(await verifyPassword("anything", null)).toBe(false)
  })
})

describe("QR payloads", () => {
  it("round-trips a signed payload and rejects tampering", () => {
    const payload = buildQrPayload("abc123token")
    expect(parseQrPayload(payload)).toEqual({ qrToken: "abc123token" })
    expect(parseQrPayload(payload.replace("abc123", "abc124"))).toBeNull()
    expect(parseQrPayload("AP1.abc123token.wrongsig")).toBeNull()
    expect(parseQrPayload("nonsense")).toBeNull()
  })
})

describe("error mapping", () => {
  it("maps codes to HTTP statuses", () => {
    expect(new AppError("SESSION_FULL", "x").status).toBe(409)
    expect(new AppError("UNAUTHORIZED", "x").status).toBe(401)
    expect(new AppError("VALIDATION_ERROR", "x").status).toBe(422)
  })
  it("recognises unique violations by constraint", () => {
    const err = Object.assign(new Error("dup"), { cause: { code: "23505", constraint_name: "tickets_booking_idx" } })
    expect(isUniqueViolation(err, "tickets_booking_idx")).toBe(true)
    expect(isUniqueViolation(err, "other")).toBe(false)
    expect(isUniqueViolation(new Error("x"))).toBe(false)
  })
  it("hides internal errors from clients", () => {
    const mapped = toAppErrorForTest(new Error("secret db detail"))
    expect(mapped.code).toBe("INTERNAL_ERROR")
    expect(mapped.message).not.toContain("secret")
  })
})

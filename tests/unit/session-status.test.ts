import { describe, it, expect } from "vitest"
import { availableSlots, checkBookable, deriveSessionStatus, occupancyPercent } from "@/lib/domain/session-status"
import { computeCapacity, SESSION_DEFAULTS } from "@/lib/domain/constants"

const H = 3_600_000
const now = new Date("2026-09-11T12:00:00Z")
const base = {
  status: "PUBLISHED" as const,
  startsAt: new Date(now.getTime() + 6 * H),
  endsAt: new Date(now.getTime() + 8 * H),
  bookingOpensAt: new Date(now.getTime() - H),
  bookingDeadline: new Date(now.getTime() + 5 * H),
  totalCapacity: 32,
  bookedCount: 0,
  heldCount: 0,
}

describe("capacity rules", () => {
  it("defaults to 8 teams × 4 players = 32", () => {
    expect(computeCapacity(SESSION_DEFAULTS.teamsCount, SESSION_DEFAULTS.playersPerTeam)).toBe(32)
  })
  it("counts holds as unavailable", () => {
    expect(availableSlots({ totalCapacity: 32, bookedCount: 20, heldCount: 5 })).toBe(7)
    expect(availableSlots({ totalCapacity: 32, bookedCount: 32, heldCount: 3 })).toBe(0)
  })
  it("computes occupancy from confirmed players only", () => {
    expect(occupancyPercent({ totalCapacity: 32, bookedCount: 16 })).toBe(50)
    expect(occupancyPercent({ totalCapacity: 0, bookedCount: 0 })).toBe(0)
  })
})

describe("deriveSessionStatus", () => {
  it("is OPEN_FOR_BOOKING inside the window with space", () => expect(deriveSessionStatus(base, now)).toBe("OPEN_FOR_BOOKING"))
  it("is PUBLISHED before the window opens", () => expect(deriveSessionStatus({ ...base, bookingOpensAt: new Date(now.getTime() + H) }, now)).toBe("PUBLISHED"))
  it("is PUBLISHED (closed) after the deadline but before kick-off", () => expect(deriveSessionStatus({ ...base, bookingDeadline: new Date(now.getTime() - H) }, now)).toBe("PUBLISHED"))
  it("is FULL at capacity", () => expect(deriveSessionStatus({ ...base, bookedCount: 32 }, now)).toBe("FULL"))
  it("is FULL when confirmed + held fill capacity (matches checkBookable)", () => {
    const heldFull = { ...base, bookedCount: 31, heldCount: 1 }
    expect(deriveSessionStatus(heldFull, now)).toBe("FULL")
    expect(checkBookable(heldFull, now)).toEqual({ bookable: false, reason: "SESSION_FULL" })
  })
  it("stays OPEN_FOR_BOOKING while at least one slot is free", () => expect(deriveSessionStatus({ ...base, bookedCount: 30, heldCount: 1 }, now)).toBe("OPEN_FOR_BOOKING"))
  it("is IN_PROGRESS between start and end", () => expect(deriveSessionStatus({ ...base, startsAt: new Date(now.getTime() - H), endsAt: new Date(now.getTime() + H) }, now)).toBe("IN_PROGRESS"))
  it("is COMPLETED after the end", () => expect(deriveSessionStatus({ ...base, startsAt: new Date(now.getTime() - 3 * H), endsAt: new Date(now.getTime() - H) }, now)).toBe("COMPLETED"))
  it("keeps admin-controlled states", () => {
    expect(deriveSessionStatus({ ...base, status: "DRAFT" }, now)).toBe("DRAFT")
    expect(deriveSessionStatus({ ...base, status: "CANCELLED" }, now)).toBe("CANCELLED")
  })
})

describe("checkBookable", () => {
  it("allows booking inside the window with free slots", () => expect(checkBookable(base, now)).toEqual({ bookable: true }))
  it("blocks drafts and cancelled sessions", () => {
    expect(checkBookable({ ...base, status: "DRAFT" }, now).reason).toBe("NOT_PUBLISHED")
    expect(checkBookable({ ...base, status: "CANCELLED" }, now).reason).toBe("CANCELLED")
  })
  it("blocks before opening and after the deadline", () => {
    expect(checkBookable({ ...base, bookingOpensAt: new Date(now.getTime() + H) }, now).reason).toBe("BOOKING_NOT_OPEN")
    expect(checkBookable({ ...base, bookingDeadline: new Date(now.getTime() - 1) }, now).reason).toBe("BOOKING_CLOSED")
  })
  it("treats held slots as taken", () => {
    expect(checkBookable({ ...base, bookedCount: 30, heldCount: 2 }, now).reason).toBe("SESSION_FULL")
    expect(checkBookable({ ...base, bookedCount: 30, heldCount: 1 }, now).bookable).toBe(true)
  })
  it("blocks once the session has started", () => {
    expect(checkBookable({ ...base, startsAt: new Date(now.getTime() - 1) }, now).reason).toBe("SESSION_STARTED")
  })
})

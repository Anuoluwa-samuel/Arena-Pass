import type { SessionStatus } from "./constants"

export interface SessionTimingLike {
  status: SessionStatus
  startsAt: Date | string
  endsAt: Date | string
  bookingOpensAt: Date | string
  bookingDeadline: Date | string
  totalCapacity: number
  bookedCount: number
  heldCount: number
}

/**
 * The status customers see, derived from the stored lifecycle status plus
 * the clock. Stored status is authoritative for admin decisions (DRAFT,
 * CANCELLED, COMPLETED); time and capacity refine PUBLISHED sessions.
 *
 * One function, used by cards, detail pages, the admin table and the booking
 * service, so the UI can never disagree with the server.
 */
export function deriveSessionStatus(s: SessionTimingLike, now: Date = new Date()): SessionStatus {
  if (s.status === "DRAFT" || s.status === "CANCELLED" || s.status === "COMPLETED") return s.status
  const startsAt = toDate(s.startsAt)
  const endsAt = toDate(s.endsAt)
  if (now >= endsAt) return "COMPLETED"
  if (now >= startsAt) return "IN_PROGRESS"
  if (s.bookedCount >= s.totalCapacity) return "FULL"
  const opens = toDate(s.bookingOpensAt)
  const deadline = toDate(s.bookingDeadline)
  if (now < opens) return "PUBLISHED"
  if (now <= deadline) return "OPEN_FOR_BOOKING"
  return "PUBLISHED" // booking window closed but session not started
}

export interface BookabilityResult {
  bookable: boolean
  reason?: "NOT_PUBLISHED" | "CANCELLED" | "BOOKING_NOT_OPEN" | "BOOKING_CLOSED" | "SESSION_FULL" | "SESSION_STARTED"
}

/** Whether a new reservation can be made right now. Counts holds as taken. */
export function checkBookable(s: SessionTimingLike, now: Date = new Date()): BookabilityResult {
  if (s.status === "DRAFT") return { bookable: false, reason: "NOT_PUBLISHED" }
  if (s.status === "CANCELLED") return { bookable: false, reason: "CANCELLED" }
  if (s.status === "COMPLETED" || now >= toDate(s.startsAt)) return { bookable: false, reason: "SESSION_STARTED" }
  if (now < toDate(s.bookingOpensAt)) return { bookable: false, reason: "BOOKING_NOT_OPEN" }
  if (now > toDate(s.bookingDeadline)) return { bookable: false, reason: "BOOKING_CLOSED" }
  if (s.bookedCount + s.heldCount >= s.totalCapacity) return { bookable: false, reason: "SESSION_FULL" }
  return { bookable: true }
}

export function availableSlots(s: Pick<SessionTimingLike, "totalCapacity" | "bookedCount" | "heldCount">) {
  return Math.max(0, s.totalCapacity - s.bookedCount - s.heldCount)
}

export function occupancyPercent(s: Pick<SessionTimingLike, "totalCapacity" | "bookedCount">) {
  if (s.totalCapacity === 0) return 0
  return Math.round((s.bookedCount / s.totalCapacity) * 100)
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Coming Soon",
  OPEN_FOR_BOOKING: "Open",
  FULL: "Sold Out",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

function toDate(v: Date | string) {
  return v instanceof Date ? v : new Date(v)
}

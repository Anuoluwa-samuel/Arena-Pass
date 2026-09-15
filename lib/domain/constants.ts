/**
 * Domain constants shared by client and server.
 *
 * Business rules live here as data, not as magic numbers scattered through
 * components and services. Defaults are used when an arena does not override
 * them; the hard limits are what the database CHECK constraints enforce.
 */

export const SESSION_DEFAULTS = {
  teamsCount: 8,
  playersPerTeam: 4,
} as const

export const SESSION_LIMITS = {
  minTeams: 2,
  maxTeams: 8,
  minPlayersPerTeam: 1,
  maxPlayersPerTeam: 4,
} as const

export function computeCapacity(teamsCount: number, playersPerTeam: number) {
  return teamsCount * playersPerTeam
}

/** How long a pending booking holds a slot before it is released. */
export const BOOKING_HOLD_MINUTES = 10

export const SESSION_STATUS = [
  "DRAFT",
  "PUBLISHED",
  "OPEN_FOR_BOOKING",
  "FULL",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const
export type SessionStatus = (typeof SESSION_STATUS)[number]

export const BOOKING_STATUS = ["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"] as const
export type BookingStatus = (typeof BOOKING_STATUS)[number]

export const TICKET_STATUS = [
  "PENDING",
  "CONFIRMED",
  "USED",
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
] as const
export type TicketStatus = (typeof TICKET_STATUS)[number]

export const PAYMENT_STATUS = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const
export type PaymentStatus = (typeof PAYMENT_STATUS)[number]

export const TICKET_TYPE = ["STANDARD"] as const
export type TicketType = (typeof TICKET_TYPE)[number]

export const TRANSACTION_TYPE = ["CHARGE", "REFUND"] as const
export type TransactionType = (typeof TRANSACTION_TYPE)[number]

export const ROLE_KEYS = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "FINANCE",
  "STAFF",
  "TICKET_AGENT",
] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

/**
 * Permission vocabulary. Route handlers call requirePermission(...) with one
 * of these; the role→permission mapping is stored in the database and seeded
 * from DEFAULT_ROLE_PERMISSIONS.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "sessions.view",
  "sessions.manage",
  "tickets.view",
  "tickets.manage",
  "tickets.validate",
  "tickets.refund",
  "customers.view",
  "customers.manage",
  "payments.view",
  "payments.manage",
  "analytics.view",
  "cms.view",
  "cms.manage",
  "media.view",
  "media.manage",
  "users.view",
  "users.manage",
  "roles.manage",
  "notifications.view",
  "notifications.manage",
  "settings.view",
  "settings.manage",
  "audit.view",
  "arenas.manage",
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: PERMISSIONS.filter((p) => p !== "roles.manage" && p !== "arenas.manage"),
  MANAGER: [
    "dashboard.view",
    "sessions.view",
    "sessions.manage",
    "tickets.view",
    "tickets.manage",
    "tickets.validate",
    "customers.view",
    "customers.manage",
    "payments.view",
    "analytics.view",
    "notifications.view",
    "audit.view",
  ],
  FINANCE: [
    "dashboard.view",
    "payments.view",
    "payments.manage",
    "tickets.view",
    "tickets.refund",
    "analytics.view",
    "audit.view",
  ],
  STAFF: ["dashboard.view", "sessions.view", "tickets.view", "tickets.validate"],
  TICKET_AGENT: [
    "dashboard.view",
    "sessions.view",
    "tickets.view",
    "tickets.manage",
    "customers.view",
    "customers.manage",
  ],
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  MANAGER: "Manager",
  FINANCE: "Finance",
  STAFF: "Staff",
  TICKET_AGENT: "Ticket Agent",
}

export const NOTIFICATION_CHANNEL = ["EMAIL", "SMS", "IN_APP", "PUSH"] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number]

export const NOTIFICATION_STATUS = ["PENDING", "SENT", "FAILED", "READ"] as const

export const CMS_PAGE_SLUGS = ["homepage", "about", "services", "contact"] as const
export type CmsPageSlug = (typeof CMS_PAGE_SLUGS)[number]

export const ANNOUNCEMENT_STATUS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const

export const DEFAULT_CURRENCY = "NGN"

/** Error codes returned by the API. Stable strings clients can switch on. */
export const ERROR_CODES = [
  "SESSION_NOT_FOUND",
  "SESSION_FULL",
  "SESSION_NOT_BOOKABLE",
  "BOOKING_CLOSED",
  "BOOKING_NOT_OPEN",
  "BOOKING_NOT_FOUND",
  "BOOKING_EXPIRED",
  "BOOKING_ALREADY_CONFIRMED",
  "DUPLICATE_BOOKING",
  "INVALID_TICKET",
  "TICKET_NOT_FOUND",
  "TICKET_ALREADY_USED",
  "TICKET_NOT_VALID",
  "TICKET_WRONG_SESSION",
  "PAYMENT_FAILED",
  "PAYMENT_PENDING",
  "PAYMENT_NOT_FOUND",
  "PAYMENT_PROVIDER_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INVALID_CREDENTIALS",
  "ACCOUNT_DISABLED",
  "EMAIL_TAKEN",
  "INVALID_RESET_TOKEN",
  "OAUTH_FAILED",
  "INTERNAL_ERROR",
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

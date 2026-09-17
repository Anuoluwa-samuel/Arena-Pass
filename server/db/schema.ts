import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import {
  ANNOUNCEMENT_STATUS,
  BOOKING_STATUS,
  CMS_PAGE_SLUGS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  PAYMENT_STATUS,
  ROLE_KEYS,
  SESSION_STATUS,
  TICKET_STATUS,
  TICKET_TYPE,
  TRANSACTION_TYPE,
} from "@/lib/domain/constants"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const sessionStatusEnum = pgEnum("session_status", SESSION_STATUS)
export const bookingStatusEnum = pgEnum("booking_status", BOOKING_STATUS)
export const ticketStatusEnum = pgEnum("ticket_status", TICKET_STATUS)
export const ticketTypeEnum = pgEnum("ticket_type", TICKET_TYPE)
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUS)
export const transactionTypeEnum = pgEnum("transaction_type", TRANSACTION_TYPE)
export const roleKeyEnum = pgEnum("role_key", ROLE_KEYS)
export const notificationChannelEnum = pgEnum("notification_channel", NOTIFICATION_CHANNEL)
export const notificationStatusEnum = pgEnum("notification_status", NOTIFICATION_STATUS)
export const cmsPageSlugEnum = pgEnum("cms_page_slug", CMS_PAGE_SLUGS)
export const announcementStatusEnum = pgEnum("announcement_status", ANNOUNCEMENT_STATUS)
export const principalTypeEnum = pgEnum("principal_type", ["user", "customer", "system"])
export const slotStatusEnum = pgEnum("slot_status", ["FREE", "HELD", "CONFIRMED"])

export const ticketNumberSeq = pgSequence("ticket_number_seq", { startWith: 1 })

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}

// ---------------------------------------------------------------------------
// Arenas (multi-tenant root)
// ---------------------------------------------------------------------------
export const arenas = pgTable("arenas", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  addressLine: text("address_line"),
  city: text("city"),
  country: text("country").default("NG"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  currency: text("currency").notNull().default("NGN"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: roleKeyEnum("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(true),
  ...timestamps,
})

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })]
)

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "set null" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)]
)

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    /** Null for guest checkout and Google-only accounts; set when the customer chooses a password. */
    passwordHash: text("password_hash"),
    /** Google's stable account id (`sub`). Linked on first Google sign-in; survives email changes. */
    googleSub: text("google_sub"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("customers_email_lower_idx").on(sql`lower(${t.email})`),
    uniqueIndex("customers_google_sub_idx").on(t.googleSub),
  ]
)

/** Server-side sessions for both admin users and customers. */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    principalType: principalTypeEnum("principal_type").notNull(),
    principalId: uuid("principal_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_sessions_principal_idx").on(t.principalType, t.principalId)]
)

/** Single-use customer password reset links. Only the SHA-256 of the token is stored. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_tokens_customer_idx").on(t.customerId)]
)

// ---------------------------------------------------------------------------
// Football sessions, teams, slots
// ---------------------------------------------------------------------------
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id")
      .notNull()
      .references(() => arenas.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    venue: text("venue").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    bookingOpensAt: timestamp("booking_opens_at", { withTimezone: true }).notNull(),
    bookingDeadline: timestamp("booking_deadline", { withTimezone: true }).notNull(),
    teamsCount: integer("teams_count").notNull().default(8),
    playersPerTeam: integer("players_per_team").notNull().default(4),
    totalCapacity: integer("total_capacity").notNull().default(32),
    /** Confirmed (paid) players. */
    bookedCount: integer("booked_count").notNull().default(0),
    /** Pending reservations awaiting payment. */
    heldCount: integer("held_count").notNull().default(0),
    /** Minor units (kobo / cents). */
    ticketPrice: integer("ticket_price").notNull(),
    currency: text("currency").notNull().default("NGN"),
    status: sessionStatusEnum("status").notNull().default("DRAFT"),
    coverMediaId: uuid("cover_media_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("sessions_arena_starts_idx").on(t.arenaId, t.startsAt),
    index("sessions_status_idx").on(t.status),
    check("sessions_capacity_matches", sql`${t.totalCapacity} = ${t.teamsCount} * ${t.playersPerTeam}`),
    check("sessions_teams_range", sql`${t.teamsCount} between 1 and 8`),
    check("sessions_players_range", sql`${t.playersPerTeam} between 1 and 4`),
    check("sessions_counts_nonnegative", sql`${t.bookedCount} >= 0 and ${t.heldCount} >= 0`),
    check("sessions_not_oversold", sql`${t.bookedCount} + ${t.heldCount} <= ${t.totalCapacity}`),
    check("sessions_time_order", sql`${t.endsAt} > ${t.startsAt}`),
    check("sessions_booking_window", sql`${t.bookingDeadline} > ${t.bookingOpensAt}`),
    check("sessions_price_nonnegative", sql`${t.ticketPrice} >= 0`),
  ]
)

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    teamNumber: integer("team_number").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("teams_session_number_idx").on(t.sessionId, t.teamNumber),
    check("teams_number_range", sql`${t.teamNumber} between 1 and 8`),
  ]
)

/**
 * Pre-generated player slots. One row per (session, team, slot). A booking
 * claims a slot by setting booking_id; the unique index guarantees a slot
 * can never be double-allocated, and the row count bounds the session.
 */
export const sessionSlots = pgTable(
  "session_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    teamNumber: integer("team_number").notNull(),
    slotNumber: integer("slot_number").notNull(),
    status: slotStatusEnum("status").notNull().default("FREE"),
    bookingId: uuid("booking_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("session_slots_position_idx").on(t.sessionId, t.teamNumber, t.slotNumber),
    uniqueIndex("session_slots_booking_idx").on(t.bookingId),
    index("session_slots_free_idx").on(t.sessionId, t.status),
    check("session_slots_number_range", sql`${t.slotNumber} between 1 and 4`),
    check(
      "session_slots_booking_consistency",
      sql`(${t.status} = 'FREE' and ${t.bookingId} is null) or (${t.status} <> 'FREE' and ${t.bookingId} is not null)`
    ),
  ]
)

// ---------------------------------------------------------------------------
// Bookings, tickets, payments
// ---------------------------------------------------------------------------
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id")
      .notNull()
      .references(() => arenas.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    slotId: uuid("slot_id").references(() => sessionSlots.id, { onDelete: "set null" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    /** Name of the player who will attend (may differ from the paying customer). */
    playerName: text("player_name").notNull(),
    status: bookingStatusEnum("status").notNull().default("PENDING"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bookings_idempotency_idx").on(t.idempotencyKey),
    index("bookings_session_status_idx").on(t.sessionId, t.status),
    index("bookings_customer_idx").on(t.customerId),
    index("bookings_expires_idx").on(t.status, t.expiresAt),
  ]
)

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id")
      .notNull()
      .references(() => arenas.id, { onDelete: "restrict" }),
    ticketNumber: text("ticket_number").notNull(),
    /** Unique: a confirmed booking yields exactly one ticket. */
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    slotId: uuid("slot_id").references(() => sessionSlots.id, { onDelete: "set null" }),
    playerName: text("player_name").notNull(),
    ticketType: ticketTypeEnum("ticket_type").notNull().default("STANDARD"),
    price: integer("price").notNull(),
    currency: text("currency").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PAID"),
    status: ticketStatusEnum("status").notNull().default("CONFIRMED"),
    /** Opaque signed reference embedded in the QR code. Never personal data. */
    qrToken: text("qr_token").notNull(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    validatedBy: uuid("validated_by").references(() => users.id, { onDelete: "set null" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("tickets_number_idx").on(t.ticketNumber),
    uniqueIndex("tickets_booking_idx").on(t.bookingId),
    uniqueIndex("tickets_qr_token_idx").on(t.qrToken),
    index("tickets_session_idx").on(t.sessionId, t.status),
    index("tickets_customer_idx").on(t.customerId),
  ]
)

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id")
      .notNull()
      .references(() => arenas.id, { onDelete: "restrict" }),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    /** Our reference sent to the provider; unique so callbacks are idempotent. */
    reference: text("reference").notNull(),
    providerTransactionId: text("provider_transaction_id"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    authorizationUrl: text("authorization_url"),
    channel: text("channel"),
    failureReason: text("failure_reason"),
    providerPayload: jsonb("provider_payload"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** Set when the customer was charged but no ticket could be issued (session filled after the hold expired). Cleared by nothing: status REFUNDED marks it resolved. */
    refundRequiredAt: timestamp("refund_required_at", { withTimezone: true }),
    refundRequiredReason: text("refund_required_reason"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payments_reference_idx").on(t.reference),
    index("payments_booking_idx").on(t.bookingId),
    index("payments_status_created_idx").on(t.status, t.createdAt),
  ]
)

/** Immutable ledger of money movements. */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id")
      .notNull()
      .references(() => arenas.id, { onDelete: "restrict" }),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    type: transactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference"),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    performedBy: uuid("performed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transactions_payment_idx").on(t.paymentId), index("transactions_created_idx").on(t.createdAt)]
)

export const ticketValidations = pgTable(
  "ticket_validations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    validatedBy: uuid("validated_by").references(() => users.id, { onDelete: "set null" }),
    result: text("result").notNull(),
    scannedValue: text("scanned_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_validations_ticket_idx").on(t.ticketId)]
)

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("waitlist_session_email_idx").on(t.sessionId, sql`lower(${t.email})`)]
)

// ---------------------------------------------------------------------------
// CMS
// ---------------------------------------------------------------------------
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "set null" }),
    storageKey: text("storage_key").notNull().unique(),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    folder: text("folder").notNull().default("general"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("media_folder_idx").on(t.folder)]
)

/** Structured page content with separate draft and published states. */
export const cmsPages = pgTable(
  "cms_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
    slug: cmsPageSlugEnum("slug").notNull(),
    draft: jsonb("draft").notNull(),
    published: jsonb("published"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("cms_pages_arena_slug_idx").on(t.arenaId, t.slug)]
)

export const cmsServices = pgTable(
  "cms_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    icon: text("icon"),
    imageMediaId: uuid("image_media_id").references(() => media.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("cms_services_order_idx").on(t.arenaId, t.sortOrder)]
)

export const faqs = pgTable(
  "faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("faqs_order_idx").on(t.arenaId, t.sortOrder)]
)

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageMediaId: uuid("image_media_id").references(() => media.id, { onDelete: "set null" }),
    status: announcementStatusEnum("status").notNull().default("DRAFT"),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("announcements_status_publish_idx").on(t.status, t.publishAt)]
)

export const banners = pgTable(
  "banners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    imageMediaId: uuid("image_media_id").references(() => media.id, { onDelete: "set null" }),
    linkUrl: text("link_url"),
    linkLabel: text("link_label"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("banners_active_order_idx").on(t.isActive, t.sortOrder)]
)

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "set null" }),
    recipientType: principalTypeEnum("recipient_type").notNull(),
    recipientId: uuid("recipient_id"),
    recipientAddress: text("recipient_address"),
    channel: notificationChannelEnum("channel").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data"),
    status: notificationStatusEnum("status").notNull().default("PENDING"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientType, t.recipientId, t.status),
    index("notifications_status_idx").on(t.status, t.createdAt),
  ]
)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "set null" }),
    actorType: principalTypeEnum("actor_type").notNull(),
    actorId: uuid("actor_id"),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    description: text("description").notNull(),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorType, t.actorId),
  ]
)

export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null = platform-wide default; arena rows override. */
    arenaId: uuid("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("system_settings_scope_key_idx").on(sql`coalesce(${t.arenaId}, '00000000-0000-0000-0000-000000000000'::uuid)`, t.key)]
)

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Arena = typeof arenas.$inferSelect
export type Role = typeof roles.$inferSelect
export type User = typeof users.$inferSelect
export type Customer = typeof customers.$inferSelect
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type AuthSession = typeof authSessions.$inferSelect
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Team = typeof teams.$inferSelect
export type SessionSlot = typeof sessionSlots.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type Ticket = typeof tickets.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type Media = typeof media.$inferSelect
export type CmsPage = typeof cmsPages.$inferSelect
export type CmsService = typeof cmsServices.$inferSelect
export type Faq = typeof faqs.$inferSelect
export type Announcement = typeof announcements.$inferSelect
export type Banner = typeof banners.$inferSelect
export type Notification = typeof notifications.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
export type SystemSetting = typeof systemSettings.$inferSelect

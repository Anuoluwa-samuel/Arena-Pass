CREATE TYPE "public"."announcement_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."cms_page_slug" AS ENUM('homepage', 'about', 'services', 'contact');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('EMAIL', 'SMS', 'IN_APP', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'READ');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."principal_type" AS ENUM('user', 'customer', 'system');--> statement-breakpoint
CREATE TYPE "public"."role_key" AS ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'STAFF', 'TICKET_AGENT');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('DRAFT', 'PUBLISHED', 'OPEN_FOR_BOOKING', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('FREE', 'HELD', 'CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('PENDING', 'CONFIRMED', 'USED', 'CANCELLED', 'REFUNDED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('STANDARD');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('CHARGE', 'REFUND');--> statement-breakpoint
CREATE SEQUENCE "public"."ticket_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"image_media_id" uuid,
	"status" "announcement_status" DEFAULT 'DRAFT' NOT NULL,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arenas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"address_line" text,
	"city" text,
	"country" text DEFAULT 'NG',
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "arenas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"actor_type" "principal_type" NOT NULL,
	"actor_id" uuid,
	"actor_name" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"description" text NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"principal_type" "principal_type" NOT NULL,
	"principal_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"title" text NOT NULL,
	"subtitle" text,
	"image_media_id" uuid,
	"link_url" text,
	"link_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"slot_id" uuid,
	"team_id" uuid,
	"player_name" text NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"slug" "cms_page_slug" NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"published_at" timestamp with time zone,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"image_media_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"password_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"folder" text DEFAULT 'general' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"recipient_type" "principal_type" NOT NULL,
	"recipient_id" uuid,
	"recipient_address" text,
	"channel" "notification_channel" NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"reference" text NOT NULL,
	"provider_transaction_id" text,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"authorization_url" text,
	"channel" text,
	"failure_reason" text,
	"provider_payload" jsonb,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_pk" PRIMARY KEY("role_id","permission")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "role_key" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"team_number" integer NOT NULL,
	"slot_number" integer NOT NULL,
	"status" "slot_status" DEFAULT 'FREE' NOT NULL,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_slots_number_range" CHECK ("session_slots"."slot_number" between 1 and 4),
	CONSTRAINT "session_slots_booking_consistency" CHECK (("session_slots"."status" = 'FREE' and "session_slots"."booking_id" is null) or ("session_slots"."status" <> 'FREE' and "session_slots"."booking_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"venue" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"booking_opens_at" timestamp with time zone NOT NULL,
	"booking_deadline" timestamp with time zone NOT NULL,
	"teams_count" integer DEFAULT 8 NOT NULL,
	"players_per_team" integer DEFAULT 4 NOT NULL,
	"total_capacity" integer DEFAULT 32 NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"held_count" integer DEFAULT 0 NOT NULL,
	"ticket_price" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" "session_status" DEFAULT 'DRAFT' NOT NULL,
	"cover_media_id" uuid,
	"published_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sessions_capacity_matches" CHECK ("sessions"."total_capacity" = "sessions"."teams_count" * "sessions"."players_per_team"),
	CONSTRAINT "sessions_teams_range" CHECK ("sessions"."teams_count" between 1 and 8),
	CONSTRAINT "sessions_players_range" CHECK ("sessions"."players_per_team" between 1 and 4),
	CONSTRAINT "sessions_counts_nonnegative" CHECK ("sessions"."booked_count" >= 0 and "sessions"."held_count" >= 0),
	CONSTRAINT "sessions_not_oversold" CHECK ("sessions"."booked_count" + "sessions"."held_count" <= "sessions"."total_capacity"),
	CONSTRAINT "sessions_time_order" CHECK ("sessions"."ends_at" > "sessions"."starts_at"),
	CONSTRAINT "sessions_booking_window" CHECK ("sessions"."booking_deadline" > "sessions"."booking_opens_at"),
	CONSTRAINT "sessions_price_nonnegative" CHECK ("sessions"."ticket_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"team_number" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_number_range" CHECK ("teams"."team_number" between 1 and 8)
);
--> statement-breakpoint
CREATE TABLE "ticket_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid,
	"session_id" uuid,
	"validated_by" uuid,
	"result" text NOT NULL,
	"scanned_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"ticket_number" text NOT NULL,
	"booking_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"team_id" uuid,
	"slot_id" uuid,
	"player_name" text NOT NULL,
	"ticket_type" "ticket_type" DEFAULT 'STANDARD' NOT NULL,
	"price" integer NOT NULL,
	"currency" text NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PAID' NOT NULL,
	"status" "ticket_status" DEFAULT 'CONFIRMED' NOT NULL,
	"qr_token" text NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"validated_by" uuid,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"ticket_id" uuid,
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"provider" text NOT NULL,
	"provider_reference" text,
	"reason" text,
	"metadata" jsonb,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid,
	"role_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_session_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."session_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_services" ADD CONSTRAINT "cms_services_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_services" ADD CONSTRAINT "cms_services_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_slots" ADD CONSTRAINT "session_slots_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_slots" ADD CONSTRAINT "session_slots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_validations" ADD CONSTRAINT "ticket_validations_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_validations" ADD CONSTRAINT "ticket_validations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_validations" ADD CONSTRAINT "ticket_validations_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_slot_id_session_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."session_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_status_publish_idx" ON "announcements" USING btree ("status","publish_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_principal_idx" ON "auth_sessions" USING btree ("principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "banners_active_order_idx" ON "banners" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idempotency_idx" ON "bookings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "bookings_session_status_idx" ON "bookings" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_expires_idx" ON "bookings" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_arena_slug_idx" ON "cms_pages" USING btree ("arena_id","slug");--> statement-breakpoint
CREATE INDEX "cms_services_order_idx" ON "cms_services" USING btree ("arena_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_lower_idx" ON "customers" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "faqs_order_idx" ON "faqs" USING btree ("arena_id","sort_order");--> statement-breakpoint
CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_type","recipient_id","status");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reference_idx" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_status_created_idx" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "session_slots_position_idx" ON "session_slots" USING btree ("session_id","team_number","slot_number");--> statement-breakpoint
CREATE UNIQUE INDEX "session_slots_booking_idx" ON "session_slots" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "session_slots_free_idx" ON "session_slots" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "sessions_arena_starts_idx" ON "sessions" USING btree ("arena_id","starts_at");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_scope_key_idx" ON "system_settings" USING btree (coalesce("arena_id", '00000000-0000-0000-0000-000000000000'::uuid),"key");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_session_number_idx" ON "teams" USING btree ("session_id","team_number");--> statement-breakpoint
CREATE INDEX "ticket_validations_ticket_idx" ON "ticket_validations" USING btree ("ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_number_idx" ON "tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_booking_idx" ON "tickets" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_qr_token_idx" ON "tickets" USING btree ("qr_token");--> statement-breakpoint
CREATE INDEX "tickets_session_idx" ON "tickets" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "tickets_customer_idx" ON "tickets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "transactions_payment_idx" ON "transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "transactions_created_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_session_email_idx" ON "waitlist_entries" USING btree ("session_id",lower("email"));
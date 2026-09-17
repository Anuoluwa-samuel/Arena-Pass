ALTER TABLE "customers" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "preferred_position" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "skill_level" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "emergency_contact_phone" text;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_username_lower_idx" ON "customers" USING btree (lower("username"));
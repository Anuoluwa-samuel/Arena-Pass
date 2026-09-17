ALTER TABLE "payments" ADD COLUMN "refund_required_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_required_reason" text;
import { z } from "zod"

export const createBookingSchema = z.object({
  sessionId: z.string().uuid(),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
  }),
  playerName: z.string().trim().min(2).max(80).optional(),
  preferredTeamNumber: z.number().int().min(1).max(8).optional(),
  /** Client-generated UUID; resubmitting the same key returns the same booking. */
  idempotencyKey: z.string().min(8).max(120),
})
export type CreateBookingInput = z.infer<typeof createBookingSchema>

export const waitlistSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
})

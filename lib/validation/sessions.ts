import { z } from "zod"
import { SESSION_LIMITS } from "@/lib/domain/constants"

const isoDate = z.coerce.date()

export const sessionInputSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    venue: z.string().trim().min(2).max(160),
    startsAt: isoDate,
    endsAt: isoDate,
    bookingOpensAt: isoDate,
    bookingDeadline: isoDate,
    teamsCount: z.number().int().min(SESSION_LIMITS.minTeams).max(SESSION_LIMITS.maxTeams),
    playersPerTeam: z.number().int().min(SESSION_LIMITS.minPlayersPerTeam).max(SESSION_LIMITS.maxPlayersPerTeam),
    /** Major units as entered by the admin (e.g. 5000 naira). */
    ticketPriceMajor: z.number().min(0).max(10_000_000),
    coverMediaId: z.string().uuid().nullable().optional(),
    publish: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.endsAt <= v.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time" })
    if (v.bookingDeadline <= v.bookingOpensAt)
      ctx.addIssue({ code: "custom", path: ["bookingDeadline"], message: "Booking must close after it opens" })
    if (v.bookingDeadline > v.startsAt)
      ctx.addIssue({ code: "custom", path: ["bookingDeadline"], message: "Booking must close before kick-off" })
  })
export type SessionInput = z.infer<typeof sessionInputSchema>

export const sessionListQuerySchema = z.object({
  status: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

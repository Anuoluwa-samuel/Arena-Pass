"use client"

import Link from "next/link"
import { ArrowRight, Calendar, Clock, MapPin, Users } from "lucide-react"
import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/hooks/use-mobile"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CountdownTimer } from "@/components/countdown-timer"
import { SessionStatusBadge } from "@/components/shared/status-badge"
import { Spotlight } from "@/components/spotlight"
import { formatMoney, formatShortDate, formatTimeRange } from "@/lib/format"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { PublicSession } from "@/server/serializers"

export type { PublicSession as Session }

export function SessionCard({ session, className }: { session: PublicSession; className?: string }) {
  const reduce = useReducedMotionSafe()
  const isOpen = session.status === "OPEN_FOR_BOOKING"
  const isFull = session.status === "FULL"
  const isUpcoming = session.status === "PUBLISHED"
  const lowStock = isOpen && session.availableSlots <= 5
  const cta = isOpen ? "Book a slot" : isFull ? "Join waitlist" : "View details"

  return (
    <Spotlight className="group h-full rounded-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5">
      <Card
        variant="glass"
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl transition-shadow duration-500 group-hover:shadow-[0_24px_60px_-28px_color-mix(in_oklch,var(--primary)_55%,transparent)]",
          isOpen && "ring-1 ring-primary/35",
          className
        )}
      >
        {/* Top edge light that brightens on hover. */}
        <span aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-40 transition-opacity duration-500 group-hover:opacity-100" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-semibold uppercase leading-tight">{session.title}</h3>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{session.venue}</span>
              </p>
            </div>
            <SessionStatusBadge status={session.status} pulse={isOpen} className="shrink-0" />
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              <span className="text-foreground">{formatShortDate(session.startsAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4" />
              <span className="text-foreground">{formatTimeRange(session.startsAt, session.endsAt)}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-4" />
                <span className={cn("font-semibold text-foreground", lowStock && "text-destructive")}>{session.availableSlots}</span>
                <span>of {session.totalCapacity} slots left</span>
              </span>
              <span className="font-display text-2xl font-semibold text-[var(--success-text)]">{formatMoney(session.ticketPrice, session.currency)}</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]" aria-hidden="true">
              <motion.div
                className={cn("h-full rounded-full", isFull ? "bg-destructive" : "bg-gradient-to-r from-primary to-[var(--streak-core)]")}
                initial={reduce ? false : { width: 0 }}
                whileInView={{ width: `${session.occupancyPercent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.15 }}
                style={reduce ? { width: `${session.occupancyPercent}%` } : undefined}
              />
            </div>
            <p className="label-mono mt-2 text-[11px] text-muted-foreground">
              {session.teamsCount} teams × {session.playersPerTeam} players
            </p>
          </div>

          {isUpcoming && (
            <div className="rounded-xl border border-border/60 bg-foreground/[0.03] p-3">
              <p className="label-mono mb-1.5 text-[11px] text-muted-foreground">Booking opens in</p>
              <CountdownTimer targetDate={new Date(session.bookingOpensAt)} variant="compact" />
            </div>
          )}
          {isOpen && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.08] p-3">
              <p className="label-mono mb-1.5 text-[11px] text-[var(--success-text)]">Booking closes in</p>
              <CountdownTimer targetDate={new Date(session.bookingDeadline)} variant="compact" />
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button asChild className="group/cta w-full" variant={isOpen ? "default" : "outline"}>
            <Link href={`/sessions/${session.id}`}>
              {cta}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </Spotlight>
  )
}

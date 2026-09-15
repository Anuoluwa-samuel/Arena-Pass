"use client"

import Link from "next/link"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CountdownTimer } from "@/components/countdown-timer"
import { SessionStatusBadge } from "@/components/shared/status-badge"
import { formatMoney, formatShortDate, formatTimeRange } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PublicSession } from "@/server/serializers"

export type { PublicSession as Session }

export function SessionCard({ session, className }: { session: PublicSession; className?: string }) {
  const isOpen = session.status === "OPEN_FOR_BOOKING"
  const isFull = session.status === "FULL"
  const isUpcoming = session.status === "PUBLISHED"
  const lowStock = isOpen && session.availableSlots <= 5
  const cta = isOpen ? "Book a slot" : isFull ? "Join waitlist" : "View details"

  return (
    <Card
      variant="glass"
      className={cn(
        "group relative flex h-full flex-col overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5",
        isOpen && "ring-1 ring-primary/40",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight">{session.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
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
            <span className="text-base font-bold text-primary">{formatMoney(session.ticketPrice, session.currency)}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
            <div className={cn("h-full rounded-full transition-[width] duration-500", isFull ? "bg-destructive" : "bg-primary")} style={{ width: `${session.occupancyPercent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {session.teamsCount} teams × {session.playersPerTeam} players
          </p>
        </div>

        {isUpcoming && (
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="mb-1.5 text-xs text-muted-foreground">Booking opens in</p>
            <CountdownTimer targetDate={new Date(session.bookingOpensAt)} variant="compact" />
          </div>
        )}
        {isOpen && (
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="mb-1.5 text-xs text-primary">Booking closes in</p>
            <CountdownTimer targetDate={new Date(session.bookingDeadline)} variant="compact" />
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full" variant={isOpen ? "default" : "secondary"}>
          <Link href={`/sessions/${session.id}`}>{cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

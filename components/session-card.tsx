"use client"

import Link from "next/link"
import { Calendar, Clock, Users } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CountdownTimer } from "@/components/countdown-timer"
import { cn } from "@/lib/utils"

export interface Session {
  id: string
  date: Date
  startTime: string
  endTime: string
  totalSlots: number
  availableSlots: number
  price: number
  venue: string
  ticketWindowStart: Date
  ticketWindowEnd: Date
}

interface SessionCardProps {
  session: Session
  className?: string
}

function getSessionStatus(session: Session): "upcoming" | "open" | "closed" | "sold-out" {
  const now = new Date()
  
  if (session.availableSlots === 0) {
    return "sold-out"
  }
  
  if (now < session.ticketWindowStart) {
    return "upcoming"
  }
  
  if (now >= session.ticketWindowStart && now <= session.ticketWindowEnd) {
    return "open"
  }
  
  return "closed"
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export function SessionCard({ session, className }: SessionCardProps) {
  const status = getSessionStatus(session)
  const isWindowOpen = status === "open"
  const isSoldOut = status === "sold-out"
  const isUpcoming = status === "upcoming"
  const isClosed = status === "closed"

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
      isWindowOpen && "ring-2 ring-primary/50",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              <span className="text-sm">{formatDate(session.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4" />
              <span className="text-sm">
                {session.startTime} – {session.endTime}
              </span>
            </div>
          </div>
          <Badge 
            variant={
              isWindowOpen ? "default" : 
              isSoldOut ? "destructive" : 
              "secondary"
            }
            className={cn(
              isWindowOpen && "bg-primary text-primary-foreground"
            )}
          >
            {isWindowOpen && "Open"}
            {isSoldOut && "Sold Out"}
            {isUpcoming && "Coming Soon"}
            {isClosed && "Closed"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-sm">
              <span className={cn(
                "font-semibold",
                session.availableSlots <= 5 && session.availableSlots > 0 && "animate-pulse text-destructive"
              )}>
                {session.availableSlots}
              </span>
              <span className="text-muted-foreground">/{session.totalSlots} spots</span>
            </span>
          </div>
          <span className="text-lg font-bold text-primary">
            ${session.price}
          </span>
        </div>

        {isUpcoming && (
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Ticket window opens in:
            </p>
            <CountdownTimer 
              targetDate={session.ticketWindowStart}
              variant="compact"
            />
          </div>
        )}

        {isWindowOpen && (
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="mb-2 text-xs text-primary">
              Window closes in:
            </p>
            <CountdownTimer 
              targetDate={session.ticketWindowEnd}
              variant="compact"
            />
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          asChild
          className="w-full"
          disabled={!isWindowOpen}
          variant={isWindowOpen ? "default" : "secondary"}
        >
          <Link href={`/sessions/${session.id}`}>
            {isWindowOpen && "Buy Ticket"}
            {isSoldOut && "Join Waitlist"}
            {isUpcoming && "View Details"}
            {isClosed && "View Details"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  AlertCircle 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { CountdownTimer } from "@/components/countdown-timer"
import { AlertModal } from "@/components/alert-modal"
import { Reveal } from "@/components/motion"
import { getSessionById } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function getSessionStatus(session: { 
  availableSlots: number
  ticketWindowStart: Date
  ticketWindowEnd: Date 
}): "upcoming" | "open" | "closed" | "sold-out" {
  const now = new Date()
  
  if (session.availableSlots === 0) return "sold-out"
  if (now < session.ticketWindowStart) return "upcoming"
  if (now >= session.ticketWindowStart && now <= session.ticketWindowEnd) return "open"
  return "closed"
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function SessionDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const session = getSessionById(id)
  const [showClosedModal, setShowClosedModal] = useState(false)

  if (!session) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24">
          <AlertCircle className="size-16 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Session Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The session you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild className="mt-6">
            <Link href="/sessions">Browse Sessions</Link>
          </Button>
        </main>
      </div>
    )
  }

  const status = getSessionStatus(session)
  const isWindowOpen = status === "open"
  const isSoldOut = status === "sold-out"
  const isUpcoming = status === "upcoming"

  const handleBuyTicket = () => {
    if (!isWindowOpen) {
      setShowClosedModal(true)
      return
    }
    router.push(`/payment?session=${session.id}`)
  }

  const handleWindowExpire = () => {
    setShowClosedModal(true)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          href="/sessions" 
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to sessions
        </Link>

        {/* Header */}
        <Reveal trigger="mount" className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Football Session
            </h1>
            <p className="mt-1 text-muted-foreground">{session.venue}</p>
          </div>
          <Badge
            variant={isWindowOpen ? "default" : isSoldOut ? "destructive" : "secondary"}
            className={cn(
              "self-start text-sm",
              isWindowOpen && "bg-primary"
            )}
          >
            {isWindowOpen && "Tickets Available"}
            {isSoldOut && "Sold Out"}
            {isUpcoming && "Coming Soon"}
            {status === "closed" && "Window Closed"}
          </Badge>
        </Reveal>

        {/* Countdown Timer */}
        {isWindowOpen && (
          <Reveal trigger="mount" delay={0.1}>
            <Card className="mb-6 border-primary/50 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <p className="text-sm font-medium text-primary">
                    Purchase window closes in:
                  </p>
                  <CountdownTimer
                    targetDate={session.ticketWindowEnd}
                    variant="large"
                    onExpire={handleWindowExpire}
                  />
                </div>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {isUpcoming && (
          <Reveal trigger="mount" delay={0.1}>
            <Card className="mb-6 border-border bg-secondary/30">
              <CardContent className="py-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Ticket window opens in:
                  </p>
                  <CountdownTimer
                    targetDate={session.ticketWindowStart}
                    variant="large"
                  />
                </div>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Session Details */}
        <Reveal trigger="mount" delay={isWindowOpen || isUpcoming ? 0.18 : 0.1}>
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  icon={Calendar}
                  label="Date"
                  value={formatDate(session.date)}
                />
                <DetailItem
                  icon={Clock}
                  label="Time"
                  value={`${session.startTime} – ${session.endTime}`}
                />
                <DetailItem
                  icon={MapPin}
                  label="Venue"
                  value={session.venue}
                />
                <DetailItem
                  icon={Users}
                  label="Available Spots"
                  value={
                    <span>
                      <span className={cn(
                        "font-semibold",
                        session.availableSlots <= 5 && session.availableSlots > 0 && "text-destructive"
                      )}>
                        {session.availableSlots}
                      </span>
                      <span className="text-muted-foreground">
                        /{session.totalSlots}
                      </span>
                    </span>
                  }
                />
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Ticket Price</span>
                  <span className="text-3xl font-bold text-primary">
                    ${session.price}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        {/* Action Button */}
        <div className="mt-8">
          {isSoldOut ? (
            <Button size="lg" variant="outline" className="w-full">
              Join Waitlist
            </Button>
          ) : (
            <Button
              size="lg"
              className={cn("w-full", isWindowOpen && "animate-pulse-glow")}
              disabled={!isWindowOpen}
              onClick={handleBuyTicket}
            >
              {isWindowOpen ? "Buy Ticket" : "Window Not Open"}
            </Button>
          )}
        </div>
      </main>

      <AlertModal
        open={showClosedModal}
        onOpenChange={setShowClosedModal}
        title="Ticket Window Closed"
        description="The purchase window for this session has closed. Please check other available sessions."
        variant="warning"
      />
    </div>
  )
}

function DetailItem({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

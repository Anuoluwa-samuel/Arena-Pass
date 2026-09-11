"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle, Calendar, Clock, MapPin, Download, ArrowRight, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Navbar } from "@/components/navbar"
import { Spinner } from "@/components/ui/spinner"
import { StaggerGroup, StaggerItem } from "@/components/motion"
import { scaleInItem, fadeUpItem } from "@/lib/motion"
import { getSessionById } from "@/lib/mock-data"

function TicketContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")
  const session = sessionId ? getSessionById(sessionId) : null

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-bold">Ticket Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find your ticket details.
        </p>
        <Button asChild className="mt-6">
          <Link href="/sessions">Browse Sessions</Link>
        </Button>
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const ticketId = `PLAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  return (
    <StaggerGroup
      trigger="mount"
      stagger={0.14}
      delayChildren={0.05}
      className="mx-auto max-w-lg"
    >
      {/* Success Message */}
      <StaggerItem variants={scaleInItem} className="mb-8 flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="size-8 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">Payment Successful!</h1>
        <p className="mt-2 text-muted-foreground">
          Your ticket has been confirmed. See you on the field!
        </p>
      </StaggerItem>

      {/* Digital Ticket */}
      <StaggerItem variants={fadeUpItem}>
        <Card className="overflow-hidden">
          <div className="bg-primary px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/20">
                  <span className="text-sm font-bold text-primary-foreground">P</span>
                </div>
                <span className="font-semibold text-primary-foreground">PlayPass</span>
              </div>
              <span className="text-sm text-primary-foreground/80">
                #{ticketId}
              </span>
            </div>
          </div>

          <CardContent className="space-y-6 p-6">
            {/* Player Info */}
            <div>
              <p className="text-sm text-muted-foreground">Player Name</p>
              <p className="text-lg font-semibold">John Doe</p>
            </div>

            <Separator />

            {/* Session Details */}
            <div className="space-y-3">
              <h3 className="font-semibold">Session Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span>{formatDate(session.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>{session.startTime} – {session.endTime}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span>{session.venue}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* QR Code Placeholder */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-40 items-center justify-center rounded-lg bg-secondary">
                <QrCode className="size-24 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Show this QR code at the venue
              </p>
            </div>
          </CardContent>

          {/* Ticket Footer */}
          <div className="border-t border-dashed border-border bg-secondary/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <span className="text-lg font-bold text-primary">${session.price}.00</span>
            </div>
          </div>
        </Card>
      </StaggerItem>

      {/* Actions */}
      <StaggerItem className="mt-8 flex flex-col gap-3">
        <Button size="lg" className="w-full">
          <Download className="mr-2 size-4" />
          Download Ticket
        </Button>
        <Button size="lg" variant="outline" asChild className="w-full">
          <Link href="/sessions">
            Browse More Sessions
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </StaggerItem>
    </StaggerGroup>
  )
}

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen">
      <Navbar isLoggedIn userName="John" />
      
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <Spinner className="size-8" />
          </div>
        }>
          <TicketContent />
        </Suspense>
      </main>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { CountdownTimer } from "@/components/countdown-timer"
import { api, errorMessage } from "@/lib/api-client"
import { formatMoney } from "@/lib/format"
import type { PublicSession, PublicTeam } from "@/server/serializers"

/** Right-hand booking panel: countdowns, the primary CTA, or the waitlist form. */
export function SessionActions({ session, teams }: { session: PublicSession; teams: PublicTeam[] }) {
  const router = useRouter()
  const isOpen = session.status === "OPEN_FOR_BOOKING"
  const isFull = session.status === "FULL"
  const isUpcoming = session.status === "PUBLISHED" && new Date(session.bookingOpensAt) > new Date()
  const isClosed = session.status === "PUBLISHED" && !isUpcoming
  const anyFree = teams.some((t) => t.freeSlots > 0)

  return (
    <Card className={isOpen ? "border-primary/50 bg-primary/5" : undefined}>
      <CardContent className="space-y-5 py-6">
        {isOpen && (
          <div className="text-center">
            <p className="text-sm font-medium text-primary">Booking closes in</p>
            <div className="mt-3 flex justify-center">
              <CountdownTimer targetDate={new Date(session.bookingDeadline)} variant="large" onExpire={() => router.refresh()} />
            </div>
          </div>
        )}
        {isUpcoming && (
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Booking opens in</p>
            <div className="mt-3 flex justify-center">
              <CountdownTimer targetDate={new Date(session.bookingOpensAt)} variant="large" onExpire={() => router.refresh()} />
            </div>
          </div>
        )}

        {isOpen && anyFree ? (
          <Button size="lg" className="w-full animate-pulse-glow" onClick={() => router.push(`/checkout/${session.id}`)}>
            Book a slot · {session.availableSlots} left
          </Button>
        ) : isFull || (isOpen && !anyFree) ? (
          <WaitlistForm sessionId={session.id} />
        ) : (
          <Button size="lg" className="w-full" disabled>
            {isUpcoming ? "Booking not open yet" : isClosed ? "Booking closed" : session.status === "CANCELLED" ? "Session cancelled" : session.status === "COMPLETED" ? "Session finished" : "In progress"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Phones only: the booking panel sits below the team board, so a bar pinned to
 * the bottom keeps the call to action in reach. It steps aside while the panel
 * itself is on screen, and only appears when there is something to do.
 */
export function MobileBookBar({ session, teams }: { session: PublicSession; teams: PublicTeam[] }) {
  const router = useRouter()
  const [panelVisible, setPanelVisible] = useState(false)
  const isOpen = session.status === "OPEN_FOR_BOOKING"
  const anyFree = teams.some((t) => t.freeSlots > 0)
  const canBook = isOpen && anyFree
  const canWaitlist = session.status === "FULL" || (isOpen && !anyFree)

  useEffect(() => {
    const panel = document.getElementById("book")
    if (!panel) return
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  if (!canBook && !canWaitlist) return null

  return (
    <div
      className={`glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 sm:hidden ${panelVisible ? "translate-y-full" : "translate-y-0"}`}
      aria-hidden={panelVisible}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-primary">{formatMoney(session.ticketPrice, session.currency)}</p>
          <p className="truncate text-xs text-muted-foreground">{canBook ? `${session.availableSlots} of ${session.totalCapacity} slots left` : "Sold out"}</p>
        </div>
        {canBook ? (
          <Button className="shrink-0" tabIndex={panelVisible ? -1 : undefined} onClick={() => router.push(`/checkout/${session.id}`)}>
            Book a slot
          </Button>
        ) : (
          <Button variant="outline" className="shrink-0" tabIndex={panelVisible ? -1 : undefined} onClick={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth" })}>
            Join waitlist
          </Button>
        )}
      </div>
    </div>
  )
}

function WaitlistForm({ sessionId }: { sessionId: string }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post("/api/sessions/" + sessionId + "/waitlist", { name, email })
      toast.success(res.message ?? "You're on the waitlist")
      setDone(true)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (done) return <p className="rounded-lg bg-secondary p-4 text-center text-sm">You&apos;re on the waitlist. We&apos;ll email you if a slot opens up.</p>

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">Every slot is taken right now. Join the waitlist and we&apos;ll email you if one frees up.</p>
      <div className="space-y-1.5">
        <Label htmlFor="wl-name">Name</Label>
        <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wl-email">Email</Label>
        <Input id="wl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <Button type="submit" variant="outline" size="lg" className="w-full" disabled={loading}>
        {loading ? <Spinner className="size-4" /> : "Join waitlist"}
      </Button>
    </form>
  )
}

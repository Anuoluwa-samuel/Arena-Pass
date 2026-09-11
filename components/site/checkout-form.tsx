"use client"

import { useMemo, useState } from "react"
import { Calendar, Clock, Lock, MapPin, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Reveal } from "@/components/motion"
import { TeamGrid } from "@/components/shared/team-grid"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"
import { formatMoney, formatShortDate, formatTimeRange } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PublicSession, PublicTeam } from "@/server/serializers"

interface Props {
  session: PublicSession
  teams: PublicTeam[]
  customer: { name: string; email: string; phone: string } | null
}

export function CheckoutForm({ session, teams, customer }: Props) {
  const [name, setName] = useState(customer?.name ?? "")
  const [email, setEmail] = useState(customer?.email ?? "")
  const [phone, setPhone] = useState(customer?.phone ?? "")
  const [playerName, setPlayerName] = useState("")
  const [sameAsCustomer, setSameAsCustomer] = useState(true)
  const [team, setTeam] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  // One key per checkout attempt: a double-click or retry never double-books.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const res = await api.post<{ booking: { id: string }; payment: { reference: string; authorizationUrl: string } }>("/api/bookings", {
        sessionId: session.id,
        customer: { name, email, phone },
        playerName: sameAsCustomer ? undefined : playerName,
        preferredTeamNumber: team ?? undefined,
        idempotencyKey,
      })
      window.location.assign(res.data.payment.authorizationUrl)
    } catch (err) {
      setLoading(false)
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setErrors(fieldErrors(err))
        toast.error(err.message)
        return
      }
      if (err instanceof ApiError && (err.code === "SESSION_FULL" || err.code === "BOOKING_CLOSED")) {
        toast.error(err.message)
        setTimeout(() => window.location.assign(`/sessions/${session.id}`), 1200)
        return
      }
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <Reveal trigger="mount" delay={0.08} className="order-last lg:order-none">
        <form onSubmit={submit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field id="name" label="Full name" error={errors["customer.name"]}>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okafor" autoComplete="name" required minLength={2} aria-invalid={!!errors["customer.name"]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="email" label="Email" hint="Your ticket is sent here" error={errors["customer.email"]}>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required inputMode="email" aria-invalid={!!errors["customer.email"]} />
                </Field>
                <Field id="phone" label="Phone" hint="Optional" error={errors["customer.phone"]}>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" autoComplete="tel" inputMode="tel" />
                </Field>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="same" checked={sameAsCustomer} onCheckedChange={(v) => setSameAsCustomer(v === true)} />
                <Label htmlFor="same" className="font-normal">I&apos;m the player attending</Label>
              </div>
              {!sameAsCustomer && (
                <Field id="playerName" label="Player's name" hint="Shown on the ticket" error={errors.playerName}>
                  <Input id="playerName" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required minLength={2} />
                </Field>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferred team</CardTitle>
              <p className="text-sm text-muted-foreground">Optional. Tap a team with open slots, or let us balance the teams for you.</p>
            </CardHeader>
            <CardContent>
              <TeamGrid teams={teams} compact selected={team} onSelect={(n) => setTeam((cur) => (cur === n ? null : n))} />
            </CardContent>
          </Card>

          <div className="sticky bottom-4 z-10 lg:static">
            <Button type="submit" size="lg" className={cn("w-full shadow-lg lg:shadow-none")} disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2"><Spinner className="size-4" />Reserving your slot…</span>
              ) : (
                `Continue to payment · ${formatMoney(session.ticketPrice, session.currency)}`
              )}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3" />
              Card details are entered on our payment partner&apos;s secure page, never on this site.
            </p>
          </div>
        </form>
      </Reveal>

      <Reveal trigger="mount" className="order-first lg:order-none">
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-4">
              <h3 className="font-semibold">{session.title}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{session.venue}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3"><Calendar className="size-4 text-muted-foreground" />{formatShortDate(session.startsAt)}</div>
              <div className="flex items-center gap-3"><Clock className="size-4 text-muted-foreground" />{formatTimeRange(session.startsAt, session.endsAt)}</div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">1 × player slot</span><span>{formatMoney(session.ticketPrice, session.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Team</span><span>{team ? `Team ${team}` : "Auto-assigned"}</span></div>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatMoney(session.ticketPrice, session.currency)}</span>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />Your slot is held for 10 minutes once you continue. If payment doesn&apos;t complete, it&apos;s released automatically.</p>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        {hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

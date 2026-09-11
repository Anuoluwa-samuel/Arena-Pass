"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"
import { SESSION_LIMITS, computeCapacity } from "@/lib/domain/constants"
import { formatMoney, toDatetimeLocalValue } from "@/lib/format"

export interface SessionFormValues {
  title: string
  description: string
  venue: string
  startsAt: string
  endsAt: string
  bookingOpensAt: string
  bookingDeadline: string
  teamsCount: number
  playersPerTeam: number
  ticketPriceMajor: number
}

interface Props {
  mode: "create" | "edit"
  sessionId?: string
  initial?: Partial<SessionFormValues>
  defaults: { teamsCount: number; playersPerTeam: number; ticketPriceMajor: number; currency: string }
  locked?: boolean
}

export function SessionForm({ mode, sessionId, initial, defaults, locked }: Props) {
  const router = useRouter()
  const [v, setV] = useState<SessionFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    venue: initial?.venue ?? "",
    startsAt: initial?.startsAt ?? "",
    endsAt: initial?.endsAt ?? "",
    bookingOpensAt: initial?.bookingOpensAt ?? toDatetimeLocalValue(new Date()),
    bookingDeadline: initial?.bookingDeadline ?? "",
    teamsCount: initial?.teamsCount ?? defaults.teamsCount,
    playersPerTeam: initial?.playersPerTeam ?? defaults.playersPerTeam,
    ticketPriceMajor: initial?.ticketPriceMajor ?? defaults.ticketPriceMajor,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<"draft" | "publish" | "save" | null>(null)
  const capacity = useMemo(() => computeCapacity(v.teamsCount, v.playersPerTeam), [v.teamsCount, v.playersPerTeam])
  const set = <K extends keyof SessionFormValues>(k: K, val: SessionFormValues[K]) => setV((s) => ({ ...s, [k]: val }))

  // Keep the booking deadline sensible: default it to one hour before kick-off.
  const onStartChange = (val: string) => {
    set("startsAt", val)
    if (!v.bookingDeadline && val) {
      const d = new Date(val)
      d.setHours(d.getHours() - 1)
      set("bookingDeadline", toDatetimeLocalValue(d))
    }
    if (!v.endsAt && val) {
      const d = new Date(val)
      d.setHours(d.getHours() + 2)
      set("endsAt", toDatetimeLocalValue(d))
    }
  }

  const submit = async (action: "draft" | "publish" | "save") => {
    setBusy(action)
    setErrors({})
    const payload = {
      ...v,
      description: v.description || undefined,
      startsAt: new Date(v.startsAt).toISOString(),
      endsAt: new Date(v.endsAt).toISOString(),
      bookingOpensAt: new Date(v.bookingOpensAt).toISOString(),
      bookingDeadline: new Date(v.bookingDeadline).toISOString(),
      publish: action === "publish",
    }
    try {
      if (mode === "create") {
        const res = await api.post<{ id: string }>("/api/admin/sessions", payload)
        toast.success(action === "publish" ? "Session published" : "Draft saved")
        router.push(`/admin/sessions/${res.data.id}`)
      } else {
        await api.patch(`/api/admin/sessions/${sessionId}`, payload)
        toast.success("Session updated")
        router.push(`/admin/sessions/${sessionId}`)
      }
      router.refresh()
    } catch (err) {
      setBusy(null)
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(mode === "create" ? "publish" : "save") }} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field id="title" label="Title" error={errors.title}><Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Friday Night Football" required /></Field>
            <Field id="venue" label="Venue / pitch" error={errors.venue}><Input id="venue" value={v.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Main Pitch" required /></Field>
            <Field id="description" label="Description" hint="Shown on the session page" error={errors.description}><Textarea id="description" rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="What makes this session special?" /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="startsAt" label="Kick-off" error={errors.startsAt}><Input id="startsAt" type="datetime-local" value={v.startsAt} onChange={(e) => onStartChange(e.target.value)} required /></Field>
            <Field id="endsAt" label="Ends" error={errors.endsAt}><Input id="endsAt" type="datetime-local" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} required /></Field>
            <Field id="bookingOpensAt" label="Booking opens" error={errors.bookingOpensAt}><Input id="bookingOpensAt" type="datetime-local" value={v.bookingOpensAt} onChange={(e) => set("bookingOpensAt", e.target.value)} required /></Field>
            <Field id="bookingDeadline" label="Booking closes" hint="Must be before kick-off" error={errors.bookingDeadline}><Input id="bookingDeadline" type="datetime-local" value={v.bookingDeadline} onChange={(e) => set("bookingDeadline", e.target.value)} required /></Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Capacity & pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {locked && <p className="rounded-md bg-warning/10 p-3 text-xs text-warning">Players have already booked, so the team structure is locked. Price and schedule can still change.</p>}
            <div className="grid grid-cols-2 gap-4">
              <Field id="teamsCount" label="Teams" error={errors.teamsCount}><Input id="teamsCount" type="number" min={SESSION_LIMITS.minTeams} max={SESSION_LIMITS.maxTeams} value={v.teamsCount} onChange={(e) => set("teamsCount", Number(e.target.value))} disabled={locked} required /></Field>
              <Field id="playersPerTeam" label="Players per team" error={errors.playersPerTeam}><Input id="playersPerTeam" type="number" min={SESSION_LIMITS.minPlayersPerTeam} max={SESSION_LIMITS.maxPlayersPerTeam} value={v.playersPerTeam} onChange={(e) => set("playersPerTeam", Number(e.target.value))} disabled={locked} required /></Field>
            </div>
            <div className="rounded-lg bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">Total capacity</p>
              <p className="text-3xl font-bold tabular-nums">{capacity} <span className="text-base font-normal text-muted-foreground">players</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{v.teamsCount} teams × {v.playersPerTeam} players · max {SESSION_LIMITS.maxTeams} × {SESSION_LIMITS.maxPlayersPerTeam}</p>
            </div>
            <Field id="price" label={`Ticket price (${defaults.currency})`} hint={formatMoney(Math.round(v.ticketPriceMajor * 100), defaults.currency)} error={errors.ticketPriceMajor}><Input id="price" type="number" min={0} step={50} value={v.ticketPriceMajor} onChange={(e) => set("ticketPriceMajor", Number(e.target.value))} required /></Field>
            <p className="text-xs text-muted-foreground">Projected revenue at full capacity: <span className="font-medium text-foreground">{formatMoney(Math.round(v.ticketPriceMajor * 100) * capacity, defaults.currency)}</span></p>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-2">
          {mode === "create" ? (
            <>
              <Button type="submit" size="lg" disabled={busy !== null}>{busy === "publish" ? <Spinner className="size-4" /> : "Publish session"}</Button>
              <Button type="button" size="lg" variant="outline" disabled={busy !== null} onClick={() => submit("draft")}>{busy === "draft" ? <Spinner className="size-4" /> : "Save as draft"}</Button>
            </>
          ) : (
            <Button type="submit" size="lg" disabled={busy !== null}>{busy ? <Spinner className="size-4" /> : "Save changes"}</Button>
          )}
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>
    </form>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2"><Label htmlFor={id}>{label}</Label>{hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}</div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

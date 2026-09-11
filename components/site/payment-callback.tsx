"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { api, errorMessage } from "@/lib/api-client"
import { DURATION, EASE_OUT } from "@/lib/motion"

type State = { kind: "verifying" } | { kind: "paid"; ticketNumber: string; accessKey: string } | { kind: "pending"; bookingId: string } | { kind: "failed"; reason: string | null; bookingId: string | null } | { kind: "error"; message: string }

/**
 * After the provider redirects back we ask OUR server to verify the payment
 * with the provider. Nothing in the URL is trusted beyond the reference.
 */
export function PaymentCallback() {
  const params = useSearchParams()
  const router = useRouter()
  const reference = params.get("reference") ?? params.get("trxref") ?? ""
  const [state, setState] = useState<State>(() => (reference ? { kind: "verifying" } : { kind: "error", message: "Missing payment reference." }))
  const attempts = useRef(0)

  useEffect(() => {
    if (!reference) return
    let cancelled = false
    const verify = async () => {
      try {
        const res = await api.get<{ status: "PAID" | "PENDING" | "FAILED"; ticketNumber?: string; accessKey?: string; reason?: string | null; bookingId?: string }>(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
        if (cancelled) return
        if (res.data.status === "PAID") {
          setState({ kind: "paid", ticketNumber: res.data.ticketNumber!, accessKey: res.data.accessKey! })
          setTimeout(() => router.replace(`/tickets/${res.data.ticketNumber}?k=${res.data.accessKey}&new=1`), 900)
        } else if (res.data.status === "PENDING" && attempts.current < 10) {
          attempts.current += 1
          setState({ kind: "pending", bookingId: res.data.bookingId ?? "" })
          setTimeout(verify, 2000)
        } else if (res.data.status === "PENDING") {
          setState({ kind: "failed", reason: "We couldn't confirm the payment yet. If you were charged, your ticket will be issued automatically once the provider confirms.", bookingId: res.data.bookingId ?? null })
        } else {
          setState({ kind: "failed", reason: res.data.reason ?? null, bookingId: res.data.bookingId ?? null })
        }
      } catch (err) {
        if (!cancelled) setState({ kind: "error", message: errorMessage(err) })
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [reference, router])

  const retry = async () => {
    if (state.kind !== "failed" || !state.bookingId) return
    try {
      const res = await api.post<{ authorizationUrl: string }>("/api/payments/initialize", { bookingId: state.bookingId })
      window.location.assign(res.data.authorizationUrl)
    } catch (err) {
      setState({ kind: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="w-full text-center">
      <AnimatePresence mode="wait">
        {(state.kind === "verifying" || state.kind === "pending") && (
          <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DURATION.fast }}>
            <Spinner className="mx-auto size-10" />
            <h1 className="mt-6 text-2xl font-bold">Confirming your payment</h1>
            <p className="mt-2 text-muted-foreground">{state.kind === "pending" ? "Waiting for the payment provider…" : "Just a moment while we verify with the payment provider."}</p>
          </motion.div>
        )}
        {state.kind === "paid" && (
          <motion.div key="paid" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: DURATION.base, ease: EASE_OUT }}>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Payment confirmed</h1>
            <p className="mt-2 text-muted-foreground">Preparing your ticket {state.ticketNumber}…</p>
          </motion.div>
        )}
        {(state.kind === "failed" || state.kind === "error") && (
          <motion.div key="failed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION.base, ease: EASE_OUT }}>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="size-8 text-destructive" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">{state.kind === "error" ? "Something went wrong" : "Payment not completed"}</h1>
            <p className="mt-2 text-muted-foreground">{state.kind === "error" ? state.message : state.reason ?? "Your card was not charged. Your slot is still held for a few minutes if you want to try again."}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {state.kind === "failed" && state.bookingId && <Button size="lg" onClick={retry}>Try again</Button>}
              <Button size="lg" variant="outline" asChild>
                <Link href="/sessions">Back to sessions</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

"use client"

import { useState } from "react"
import { CreditCard, FlaskConical } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { api, errorMessage } from "@/lib/api-client"
import { formatMoney } from "@/lib/format"

export function MockPayPanel({ reference, amount, currency, callbackUrl, status }: { reference: string; amount: number; currency: string; callbackUrl: string; status: string }) {
  const [busy, setBusy] = useState<"success" | "failed" | null>(null)
  const choose = async (outcome: "success" | "failed") => {
    setBusy(outcome)
    try {
      await api.post("/api/payments/mock/complete", { reference, outcome })
      window.location.assign(callbackUrl)
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(null)
    }
  }
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
            <FlaskConical className="size-3.5" /> Test payment page
          </div>
          <CardTitle className="flex items-center gap-2"><CreditCard className="size-5" />Simulated card payment</CardTitle>
          <p className="text-sm text-muted-foreground">In production this is the payment provider&apos;s hosted checkout. Choose an outcome to continue.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono">{reference}</span></div>
            <div className="mt-2 flex justify-between text-base font-semibold"><span>Amount</span><span className="text-primary">{formatMoney(amount, currency)}</span></div>
          </div>
          {status !== "PENDING" ? (
            <p className="text-sm text-muted-foreground">This payment is already {status.toLowerCase()}.</p>
          ) : (
            <div className="grid gap-3">
              <Button size="lg" onClick={() => choose("success")} disabled={busy !== null}>
                {busy === "success" ? <Spinner className="size-4" /> : "Pay successfully"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => choose("failed")} disabled={busy !== null}>
                {busy === "failed" ? <Spinner className="size-4" /> : "Simulate a declined card"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

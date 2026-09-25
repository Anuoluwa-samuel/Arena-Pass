"use client"

import { useState } from "react"
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { api, errorMessage } from "@/lib/api-client"

/**
 * The second step of sign-in, shared by the customer and admin forms. The
 * password is already accepted at this point and is held server-side behind a
 * short-lived challenge cookie, so nothing sensitive lives in this component —
 * only the code being typed.
 */
export function TwoFactorPrompt({
  scope,
  onVerified,
  onCancel,
}: {
  scope: "admin" | "customer"
  onVerified: () => void
  onCancel: () => void
}) {
  const [code, setCode] = useState("")
  const [recovery, setRecovery] = useState("")
  const [useRecovery, setUseRecovery] = useState(false)
  const [loading, setLoading] = useState(false)

  const value = useRecovery ? recovery : code
  const ready = useRecovery ? recovery.trim().length >= 6 : code.length === 6

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || loading) return
    setLoading(true)
    try {
      await api.post("/api/auth/2fa/verify", { code: value, scope })
      onVerified()
    } catch (err) {
      setLoading(false)
      setCode("")
      setRecovery("")
      toast.error(errorMessage(err))
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
          {useRecovery ? <KeyRound className="size-5" /> : <ShieldCheck className="size-5" />}
        </span>
        <div>
          <h2 className="text-lg font-semibold">Two-step verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {useRecovery
              ? "Enter one of the recovery codes you saved when you turned this on."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>
      </div>

      {useRecovery ? (
        <input
          // Not an OTP input: recovery codes are ten characters with a dash.
          autoFocus
          value={recovery}
          onChange={(e) => setRecovery(e.target.value)}
          placeholder="XXXXX-XXXXX"
          autoComplete="one-time-code"
          spellCheck={false}
          aria-label="Recovery code"
          className="h-12 w-full rounded-xl border border-input bg-transparent px-4 text-center font-mono uppercase tracking-[0.2em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : (
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            autoFocus
            // Submitting on the sixth digit saves a tap; the button stays for keyboard users.
            onComplete={(v) => v.length === 6 && submit(new Event("submit") as unknown as React.FormEvent)}
            aria-label="Authentication code"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}

      <Button type="submit" size="lg" className="group w-full" disabled={!ready || loading}>
        {loading ? <><Spinner className="size-4" />Verifying…</> : <>Verify<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></>}
      </Button>

      <div className="flex flex-col items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setUseRecovery(!useRecovery)
            setCode("")
            setRecovery("")
          }}
          className="font-medium text-muted-foreground hover:text-primary hover:underline"
        >
          {useRecovery ? "Use your authenticator app instead" : "Lost your phone? Use a recovery code"}
        </button>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground hover:underline">
          Back to sign in
        </button>
      </div>
    </form>
  )
}

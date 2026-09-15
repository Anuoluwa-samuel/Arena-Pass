"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FloatingField, LoginForm } from "@/components/ui/login-form"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/site/auth-shell"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"

export function ForgotPasswordForm({ siteName }: { siteName: string }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await api.post("/api/auth/customer/password/forgot", { email })
      setSentTo(email)
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell siteName={siteName}>
      {/* Polite live region: the swap to the confirmation card is announced to screen readers. */}
      <div aria-live="polite">
        {sentTo ? (
          <LoginForm
            title="Check your email"
            description={
              <>
                If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve sent a link to reset your password. It expires in 30 minutes.
              </>
            }
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4"
          >
            <Button asChild size="lg" className="w-full">
              <Link href="/login"><ArrowLeft className="size-4" />Back to sign in</Link>
            </Button>
            <button type="button" onClick={() => setSentTo(null)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline">
              Didn&apos;t get it? Try again
            </button>
          </LoginForm>
        ) : (
          <LoginForm
            title="Forgot password?"
            description="Enter your account email and we'll send you a link to reset it."
            onSubmit={submit}
            footer={<>Remembered it? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>}
          >
            <FloatingField id="email" type="email" label="Email address" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required error={errors.email} />
            <Button type="submit" size="lg" className="group w-full" disabled={loading}>
              {loading ? (
                <><Spinner className="size-4" />Sending…</>
              ) : (
                <>Send reset link<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </Button>
          </LoginForm>
        )}
      </div>
    </AuthShell>
  )
}

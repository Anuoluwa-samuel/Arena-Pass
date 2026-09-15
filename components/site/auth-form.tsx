"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FloatingField, LoginForm } from "@/components/ui/login-form"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/site/auth-shell"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"
import { safeNextPath } from "@/lib/safe-next"

const DEFAULT_NEXT = "/account/tickets"

/** `?error=` codes the Google callback redirects back with. */
const OAUTH_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't complete. Please try again.",
  google_cancelled: "Google sign-in was cancelled.",
  google_unavailable: "Google sign-in isn't available right now.",
  account_disabled: "This account has been disabled.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
}

/** Google's multicolour "G" — brand colours are mandated by Google's sign-in guidelines, so not themed. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z" />
    </svg>
  )
}

export function AuthForm({ mode, siteName, googleEnabled }: { mode: "login" | "signup"; siteName: string; googleEnabled: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNextPath(params.get("next"), DEFAULT_NEXT)
  const nextQuery = next !== DEFAULT_NEXT ? `?next=${encodeURIComponent(next)}` : ""
  const oauthError = OAUTH_ERRORS[params.get("error") ?? ""]
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      if (mode === "login") await api.post("/api/auth/customer/login", { email, password })
      else await api.post("/api/auth/customer/signup", { name, email, phone, password })
      router.push(next)
      router.refresh()
    } catch (err) {
      setLoading(false)
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    }
  }

  return (
    <AuthShell siteName={siteName}>
      <LoginForm
        title={mode === "login" ? "Welcome back" : "Create an account"}
        description={mode === "login" ? "Sign in to see your tickets" : "Keep all your tickets in one place"}
        onSubmit={submit}
        footer={
          mode === "login" ? (
            <>Don&apos;t have an account? <Link href={`/signup${nextQuery}`} className="font-semibold text-primary hover:underline">Sign up</Link></>
          ) : (
            <>Already have an account? <Link href={`/login${nextQuery}`} className="font-semibold text-primary hover:underline">Sign in</Link></>
          )
        }
      >
        {oauthError && (
          <p role="alert" className="-mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {oauthError}
          </p>
        )}
        {mode === "signup" && (
          <FloatingField id="name" label="Full name" icon={User} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} error={errors.name} />
        )}
        <FloatingField id="email" type="email" label="Email address" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required error={errors.email} />
        {mode === "signup" && (
          <FloatingField id="phone" type="tel" label="Phone" labelSuffix="(optional)" icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" error={errors.phone} />
        )}
        <FloatingField
          id="password"
          type={show ? "text" : "password"}
          label="Password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : 1}
          help={mode === "signup" ? "At least 8 characters" : undefined}
          error={errors.password}
          trailing={
            <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        {mode === "login" && (
          <div className="-mt-6 flex justify-end">
            <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}
        <Button type="submit" size="lg" className="group w-full" disabled={loading}>
          {loading ? (
            <><Spinner className="size-4" />{mode === "login" ? "Signing in…" : "Creating account…"}</>
          ) : (
            <>{mode === "login" ? "Sign in" : "Create account"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></>
          )}
        </Button>
        {googleEnabled && (
          <>
            <div className="flex items-center gap-4" aria-hidden="true">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button asChild variant="outline" size="lg" className="w-full">
              {/* A plain <a>, not <Link>: this is a full-page hop to an API route that redirects to Google. */}
              <a href={`/api/auth/customer/google${nextQuery}`}>
                <GoogleIcon className="size-4" />
                {mode === "login" ? "Continue with Google" : "Sign up with Google"}
              </a>
            </Button>
          </>
        )}
      </LoginForm>
    </AuthShell>
  )
}

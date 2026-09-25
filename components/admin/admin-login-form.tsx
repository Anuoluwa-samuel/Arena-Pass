"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FloatingField, LoginForm } from "@/components/ui/login-form"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/site/auth-shell"
import { TwoFactorPrompt } from "@/components/site/two-factor-prompt"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"
import { safeNextPath } from "@/lib/safe-next"

export function AdminLoginForm({ siteName, idleTimeout = false }: { siteName: string; idleTimeout?: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  // Same-site path check first, then keep admins inside the admin area.
  const candidate = safeNextPath(params.get("next"), "/admin")
  const next = candidate === "/admin" || candidate.startsWith("/admin/") ? candidate : "/admin"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [needsCode, setNeedsCode] = useState(false)

  const finish = () => {
    router.push(next)
    router.refresh()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const res = await api.post<{ twoFactorRequired?: boolean }>("/api/auth/login", { email, password })
      if (res?.data?.twoFactorRequired) {
        setLoading(false)
        setPassword("")
        setNeedsCode(true)
        return
      }
      finish()
    } catch (err) {
      setLoading(false)
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    }
  }

  if (needsCode) {
    return (
      <AuthShell siteName={siteName} className="min-h-svh">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <TwoFactorPrompt scope="admin" onVerified={finish} onCancel={() => setNeedsCode(false)} />
        </div>
      </AuthShell>
    )
  }

  return (
    // No site navbar on admin routes, so the shell fills the whole viewport.
    <AuthShell siteName={siteName} className="min-h-svh">
      <LoginForm
        title={
          <>
            <span aria-hidden="true" className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="size-5 text-primary" />
            </span>
            Admin sign in
          </>
        }
        description="Restricted to arena staff and administrators"
        onSubmit={submit}
        footer={
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            Back to the public site
          </Link>
        }
      >
        {idleTimeout && (
          <p role="status" className="-mb-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
            You were signed out after 30 minutes of inactivity. Please sign in again.
          </p>
        )}
        <FloatingField id="email" type="email" label="Email address" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required error={errors.email} />
        <FloatingField
          id="password"
          type={show ? "text" : "password"}
          label="Password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          // Admins have no self-service reset: another admin resets it from the Administrators page.
          help="Forgot it? Ask a super admin to reset it."
          error={errors.password}
          trailing={
            <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        <Button type="submit" size="lg" className="group w-full" disabled={loading}>
          {loading ? (
            <><Spinner className="size-4" />Signing in…</>
          ) : (
            <>Sign in<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></>
          )}
        </Button>
      </LoginForm>
    </AuthShell>
  )
}

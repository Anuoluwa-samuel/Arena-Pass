"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FloatingField, LoginForm } from "@/components/ui/login-form"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/site/auth-shell"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"

export function ResetPasswordForm({ siteName }: { siteName: string }) {
  const router = useRouter()
  const params = useSearchParams()
  // Read the token once, then drop it from the address bar so the credential
  // doesn't linger in browser history, screenshots or a shared screen.
  const [token] = useState(() => params.get("token") ?? "")
  useEffect(() => {
    if (params.get("token")) window.history.replaceState(null, "", window.location.pathname)
  }, [params])

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expired, setExpired] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (password !== confirm) {
      setErrors({ confirm: "Passwords don't match" })
      return
    }
    setLoading(true)
    try {
      await api.post("/api/auth/customer/password/reset", { token, password })
      toast.success("Password updated. You're signed in.")
      router.push("/account/tickets")
      router.refresh()
    } catch (err) {
      setLoading(false)
      if (err instanceof ApiError && err.code === "INVALID_RESET_TOKEN") return setExpired(true)
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    }
  }

  const backToSignIn = <>Remembered it? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>

  if (!token || expired) {
    return (
      <AuthShell siteName={siteName}>
        <LoginForm
          title={expired ? "This link has expired" : "Reset link missing"}
          description={expired ? "Reset links work once and expire after 30 minutes. Request a new one below." : "Open the link from your reset email, or request a new one."}
          onSubmit={(e) => e.preventDefault()}
          footer={backToSignIn}
        >
          <Button asChild size="lg" className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </LoginForm>
      </AuthShell>
    )
  }

  return (
    <AuthShell siteName={siteName}>
      <LoginForm title="Choose a new password" description="You'll be signed out everywhere else once it's saved." onSubmit={submit} footer={backToSignIn}>
        <FloatingField
          id="password"
          type={show ? "text" : "password"}
          label="New password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          help="At least 8 characters"
          error={errors.password}
          trailing={
            <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setShow(!show)} aria-label={show ? "Hide passwords" : "Show passwords"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        <FloatingField
          id="confirm-password"
          type={show ? "text" : "password"}
          label="Confirm password"
          icon={Lock}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" className="group w-full" disabled={loading}>
          {loading ? (
            <><Spinner className="size-4" />Updating…</>
          ) : (
            <>Update password<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></>
          )}
        </Button>
      </LoginForm>
    </AuthShell>
  )
}

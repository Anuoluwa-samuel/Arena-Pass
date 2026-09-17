"use client"

import { useState } from "react"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { SectionLabel } from "@/components/shared/section-label"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"

export function PasswordForm({ hasPassword, usesGoogle }: { hasPassword: boolean; usesGoogle: boolean }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [canChange, setCanChange] = useState(hasPassword)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (next !== confirm) return setErrors({ confirm: "Passwords don't match" })
    setBusy(true)
    try {
      const res = await api.post("/api/me/password", { currentPassword: canChange ? current : undefined, newPassword: next })
      toast.success(res.message ?? "Password updated")
      setCurrent("")
      setNext("")
      setConfirm("")
      setCanChange(true)
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const type = show ? "text" : "password"
  return (
    <form id="password" onSubmit={submit} className="glass scroll-mt-24 space-y-5 rounded-3xl p-6 sm:p-8" noValidate>
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel index={5}>Password</SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">
            {canChange ? "Changing it signs you out on every other device." : usesGoogle ? "You sign in with Google. Set a password to also sign in with your email." : "Set a password to sign in with your email."}
          </p>
        </div>
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25"><KeyRound className="size-4" /></span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {canChange && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" aria-invalid={errors.currentPassword ? true : undefined} aria-describedby={errors.currentPassword ? "currentPassword-error" : undefined} />
            {errors.currentPassword && <p id="currentPassword-error" className="text-xs text-[var(--danger-text)]">{errors.currentPassword}</p>}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} aria-invalid={errors.newPassword ? true : undefined} aria-describedby="newPassword-help" />
          <p id="newPassword-help" className={errors.newPassword ? "text-xs text-[var(--danger-text)]" : "text-xs text-muted-foreground"}>{errors.newPassword || "At least 8 characters"}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type={type} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={errors.confirm ? true : undefined} aria-describedby={errors.confirm ? "confirm-error" : undefined} />
          {errors.confirm && <p id="confirm-error" className="text-xs text-[var(--danger-text)]">{errors.confirm}</p>}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={() => setShow(!show)} aria-pressed={show}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{show ? "Hide passwords" : "Show passwords"}
        </Button>
        <Button type="submit" size="lg" disabled={busy || !next || !confirm || (canChange && !current)}>
          {busy ? <><Spinner className="size-4" />Saving…</> : canChange ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  )
}

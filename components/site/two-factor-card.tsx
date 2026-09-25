"use client"

import Image from "next/image"
import { useState } from "react"
import { Check, Copy, Download, ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { SectionLabel } from "@/components/shared/section-label"
import { api, errorMessage } from "@/lib/api-client"

type Status = { enabled: boolean; recoveryCodesLeft: number }
type Setup = { qrImage: string; secret: string }

/**
 * Self-service 2FA, used by both customer profiles and the admin account page.
 * Enrolment is deliberately three visible steps — scan, confirm, save codes —
 * because the failure mode people hit is switching it on and only discovering
 * later that the authenticator never held the secret.
 */
export function TwoFactorCard({ initial, className = "" }: { initial: Status; className?: string }) {
  const [status, setStatus] = useState(initial)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [disarming, setDisarming] = useState(false)

  const begin = async () => {
    setBusy(true)
    try {
      const res = await api.post<Setup>("/api/auth/2fa/setup")
      setSetup(res.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api.post<{ recoveryCodes: string[] }>("/api/auth/2fa/enable", { code })
      setCodes(res.data.recoveryCodes)
      setStatus({ enabled: true, recoveryCodesLeft: res.data.recoveryCodes.length })
      setSetup(null)
      setCode("")
      toast.success("Two-factor authentication is on")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const disable = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post("/api/auth/2fa/disable", { code })
      setStatus({ enabled: false, recoveryCodesLeft: 0 })
      setDisarming(false)
      setCode("")
      toast.success("Two-factor authentication is off")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api.post<{ recoveryCodes: string[] }>("/api/auth/2fa/recovery-codes", { code })
      setCodes(res.data.recoveryCodes)
      setStatus({ ...status, recoveryCodesLeft: res.data.recoveryCodes.length })
      setCode("")
      toast.success("New recovery codes issued")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`glass space-y-5 rounded-3xl p-6 sm:p-8 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel>Two-step verification</SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask for a code from your authenticator app as well as your password.
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            status.enabled ? "bg-primary/12 text-primary ring-1 ring-primary/25" : "bg-secondary text-muted-foreground"
          }`}
        >
          {status.enabled ? <ShieldCheck className="size-3.5" /> : <ShieldOff className="size-3.5" />}
          {status.enabled ? "On" : "Off"}
        </span>
      </div>

      {/* Shown once, straight after enrolling or regenerating. */}
      {codes && <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />}

      {!status.enabled && !setup && !codes && (
        <Button onClick={begin} disabled={busy}>
          {busy ? <><Spinner className="size-4" />Preparing…</> : "Turn on two-step verification"}
        </Button>
      )}

      {setup && (
        <form onSubmit={confirm} className="space-y-5">
          <ol className="space-y-5 text-sm">
            <li>
              <p className="font-medium">1. Scan this with your authenticator app</p>
              <p className="mt-1 text-muted-foreground">Google Authenticator, Authy, 1Password — any of them work.</p>
              <div className="mt-3 inline-block rounded-2xl bg-white p-3">
                {/* Data URI from the server; unoptimised because there is nothing for the image CDN to do. */}
                <Image src={setup.qrImage} alt="Two-factor setup QR code" width={200} height={200} unoptimized />
              </div>
            </li>
            <li>
              <p className="font-medium">2. Can&apos;t scan? Type this key instead</p>
              <CopyRow value={setup.secret} />
            </li>
            <li>
              <p className="font-medium">3. Enter the 6-digit code it shows</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  className="w-36 text-center font-mono tracking-[0.3em]"
                  aria-label="Authentication code"
                />
                <Button type="submit" disabled={busy || code.length !== 6}>
                  {busy ? <><Spinner className="size-4" />Checking…</> : "Confirm"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setSetup(null); setCode("") }} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </li>
          </ol>
        </form>
      )}

      {status.enabled && !codes && (
        <div className="space-y-4 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">
            {status.recoveryCodesLeft} recovery {status.recoveryCodesLeft === 1 ? "code" : "codes"} left.
            {status.recoveryCodesLeft <= 3 && " Worth generating a new set."}
          </p>
          <form onSubmit={disarming ? disable : regenerate} className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="twofa-code" className="text-xs text-muted-foreground">
                Current code or a recovery code
              </Label>
              <Input
                id="twofa-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                placeholder="000000"
                className="mt-1.5 w-44 font-mono"
              />
            </div>
            {disarming ? (
              <>
                <Button type="submit" variant="destructive" disabled={busy || code.length < 6}>
                  {busy ? <><Spinner className="size-4" />Turning off…</> : "Confirm turn off"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setDisarming(false); setCode("") }} disabled={busy}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button type="submit" variant="outline" disabled={busy || code.length < 6}>
                  {busy ? <><Spinner className="size-4" />Working…</> : "New recovery codes"}
                </Button>
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDisarming(true)} disabled={busy}>
                  Turn off
                </Button>
              </>
            )}
          </form>
          <p className="text-xs text-muted-foreground">
            A current code is required either way, so nobody can weaken your account from a screen you left unlocked.
          </p>
        </div>
      )}
    </section>
  )
}

/** The one and only time the recovery codes are visible. */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = codes.join("\n")
  const download = () => {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "arena-pass-recovery-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <p className="font-medium">Save your recovery codes</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Each one works once, if you lose your phone. This is the only time they are shown.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="rounded-lg bg-background/60 px-3 py-1.5 text-center tracking-wider">{c}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download className="size-3.5" />Download
        </Button>
        <CopyButton value={text} />
        <Button type="button" size="sm" onClick={onDone}>I&apos;ve saved them</Button>
      </div>
    </div>
  )
}

function CopyRow({ value }: { value: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="flex-1 break-all rounded-lg bg-secondary px-3 py-2 font-mono text-xs tracking-wider">{value}</code>
      <CopyButton value={value} />
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Clipboard is blocked in some browsers and every insecure context;
          // the value is on screen to copy by hand, so this is not worth an error.
          toast.message("Copy it manually — your browser blocked clipboard access")
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

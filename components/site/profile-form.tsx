"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AtSign, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { SectionLabel } from "@/components/shared/section-label"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"
import { GENDER_LABELS, GENDERS, POSITION_LABELS, POSITIONS, SKILL_LABELS, SKILL_LEVELS } from "@/lib/domain/profile"
import type { CustomerProfile } from "@/server/services/profile"
import { cn } from "@/lib/utils"

type FormState = {
  name: string
  username: string
  phone: string
  dateOfBirth: string
  gender: string
  city: string
  preferredPosition: string
  skillLevel: string
  emergencyContactName: string
  emergencyContactPhone: string
}

/** Radix Select can't hold an empty value, so "not set" has its own sentinel. */
const NONE = "__none"

function toForm(p: CustomerProfile): FormState {
  return {
    name: p.name,
    username: p.username ?? "",
    phone: p.phone ?? "",
    dateOfBirth: p.dateOfBirth ?? "",
    gender: p.gender ?? "",
    city: p.city ?? "",
    preferredPosition: p.preferredPosition ?? "",
    skillLevel: p.skillLevel ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
  }
}

function Field({ id, label, hint, error, children, className }: { id: string; label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-[var(--danger-text)]">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function Choice({ id, value, onChange, options, labels, placeholder, invalid }: { id: string; value: string; onChange: (v: string) => void; options: readonly string[]; labels: Record<string, string>; placeholder: string; invalid?: boolean }) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{labels[o]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ProfileForm({ profile, today }: { profile: CustomerProfile; today: string }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toForm(profile))
  const [saved, setSaved] = useState<FormState>(() => toForm(profile))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }))
  }
  const input = (key: keyof FormState) => ({
    id: key,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key)(e.target.value),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await api.patch<CustomerProfile>("/api/me/profile", form)
      const next = toForm(res.data)
      setForm(next)
      setSaved(next)
      toast.success("Profile saved")
      router.refresh() // sidebar name and @username
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="glass space-y-10 rounded-3xl p-6 sm:p-8" noValidate>
      <fieldset className="space-y-5">
        <legend><SectionLabel index={1}>Account</SectionLabel></legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Full name" error={errors.name}>
            <Input {...input("name")} autoComplete="name" required maxLength={80} />
          </Field>
          <Field id="username" label="Username" hint="3–20 characters: letters, numbers, _ or ." error={errors.username}>
            <div className="relative">
              <AtSign aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input {...input("username")} onChange={(e) => set("username")(e.target.value.toLowerCase().replace(/\s/g, ""))} className="pl-9" autoComplete="username" maxLength={20} spellCheck={false} />
            </div>
          </Field>
          <Field id="email" label="Email" hint="Contact support to change your sign-in email." className="sm:col-span-2">
            <Input id="email" value={profile.email} readOnly disabled aria-describedby="email-hint" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend><SectionLabel index={2}>About you</SectionLabel></legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth}>
            <Input {...input("dateOfBirth")} type="date" max={today} min="1900-01-01" autoComplete="bday" />
          </Field>
          <Field id="gender" label="Gender" error={errors.gender}>
            <Choice id="gender" value={form.gender} onChange={set("gender")} options={GENDERS} labels={GENDER_LABELS} placeholder="Not set" invalid={!!errors.gender} />
          </Field>
          <Field id="phone" label="Phone" error={errors.phone}>
            <Input {...input("phone")} type="tel" autoComplete="tel" maxLength={30} />
          </Field>
          <Field id="city" label="Area / city" hint="e.g. Lekki, Lagos" error={errors.city}>
            <Input {...input("city")} autoComplete="address-level2" maxLength={80} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend><SectionLabel index={3}>On the pitch</SectionLabel></legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="preferredPosition" label="Preferred position" error={errors.preferredPosition}>
            <Choice id="preferredPosition" value={form.preferredPosition} onChange={set("preferredPosition")} options={POSITIONS} labels={POSITION_LABELS} placeholder="Not set" invalid={!!errors.preferredPosition} />
          </Field>
          <Field id="skillLevel" label="Skill level" hint="Helps keep teams balanced." error={errors.skillLevel}>
            <Choice id="skillLevel" value={form.skillLevel} onChange={set("skillLevel")} options={SKILL_LEVELS} labels={SKILL_LABELS} placeholder="Not set" invalid={!!errors.skillLevel} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend><SectionLabel index={4}>Emergency contact</SectionLabel></legend>
        <p className="-mt-2 text-sm text-muted-foreground">Only arena staff see this, and only use it if something happens during a session.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="emergencyContactName" label="Contact name" error={errors.emergencyContactName}>
            <Input {...input("emergencyContactName")} maxLength={80} />
          </Field>
          <Field id="emergencyContactPhone" label="Contact phone" error={errors.emergencyContactPhone}>
            <Input {...input("emergencyContactPhone")} type="tel" maxLength={30} />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-end">
        {dirty && !saving && (
          <Button type="button" variant="ghost" onClick={() => { setForm(saved); setErrors({}) }}>
            Discard changes
          </Button>
        )}
        <Button type="submit" size="lg" disabled={saving || !dirty}>
          {saving ? <><Spinner className="size-4" />Saving…</> : dirty ? "Save changes" : <><Check className="size-4" />Saved</>}
        </Button>
      </div>
    </form>
  )
}

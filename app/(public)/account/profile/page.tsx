import { redirect } from "next/navigation"
import { Reveal } from "@/components/motion"
import { PageHeader } from "@/components/shared/page-header"
import { PasswordForm } from "@/components/site/password-form"
import { ProfileForm } from "@/components/site/profile-form"
import { TwoFactorCard } from "@/components/site/two-factor-card"
import { getCurrentCustomer } from "@/server/auth/session"
import { twoFactorStatus } from "@/server/auth/two-factor"
import { getCustomerProfile } from "@/server/services/profile"
import { initials } from "@/lib/format"
import { GENDER_LABELS, POSITION_LABELS, SKILL_LABELS, type Gender, type Position, type SkillLevel } from "@/lib/domain/profile"

export const dynamic = "force-dynamic"
export const metadata = { title: "Profile" }

export default async function ProfilePage() {
  const customer = await getCurrentCustomer()
  if (!customer) redirect("/login?next=/account/profile")
  const [profile, twoFactor] = await Promise.all([
    getCustomerProfile(customer.id),
    twoFactorStatus("customer", customer.id),
  ])
  // Local calendar date for the date-of-birth picker's upper bound.
  const today = new Date().toLocaleDateString("en-CA")

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Reveal trigger="mount">
        <PageHeader eyebrow="Account" title="Your profile" description="Keep your details up to date so the arena can reach you and balance the teams." />
      </Reveal>
      <div className="mt-10 grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
        <Reveal trigger="mount" delay={0.1} className="glass rounded-3xl p-6 lg:sticky lg:top-6">
          <span aria-hidden="true" className="grid size-20 place-items-center rounded-full bg-primary/15 font-display text-3xl font-semibold text-primary ring-1 ring-primary/30">{initials(profile.name)}</span>
          <p className="mt-5 font-display text-3xl font-semibold uppercase leading-none">{profile.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{profile.username ? `@${profile.username}` : "No username yet"}</p>
          <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
            <div><dt className="label-mono text-[11px] text-muted-foreground">Email</dt><dd className="mt-0.5 break-all">{profile.email}</dd></div>
            <div><dt className="label-mono text-[11px] text-muted-foreground">Position</dt><dd className="mt-0.5">{profile.preferredPosition ? POSITION_LABELS[profile.preferredPosition as Position] : "Not set"}</dd></div>
            <div><dt className="label-mono text-[11px] text-muted-foreground">Level</dt><dd className="mt-0.5">{profile.skillLevel ? SKILL_LABELS[profile.skillLevel as SkillLevel] : "Not set"}</dd></div>
            {profile.gender && <div><dt className="label-mono text-[11px] text-muted-foreground">Gender</dt><dd className="mt-0.5">{GENDER_LABELS[profile.gender as Gender]}</dd></div>}
          </dl>
        </Reveal>
        <div className="space-y-6">
          <Reveal trigger="mount" delay={0.15}>
            <ProfileForm profile={profile} today={today} />
          </Reveal>
          <Reveal trigger="mount" delay={0.2}>
            <PasswordForm hasPassword={profile.hasPassword} usesGoogle={profile.usesGoogle} />
          </Reveal>
          <Reveal trigger="mount" delay={0.25}>
            <TwoFactorCard initial={{ enabled: twoFactor.enabled, recoveryCodesLeft: twoFactor.recoveryCodesLeft }} />
          </Reveal>
        </div>
      </div>
    </main>
  )
}

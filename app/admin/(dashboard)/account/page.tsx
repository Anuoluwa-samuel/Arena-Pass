import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { TwoFactorCard } from "@/components/site/two-factor-card"
import { getCurrentUser } from "@/server/auth/session"
import { twoFactorStatus } from "@/server/auth/two-factor"
import { ADMIN_IDLE_TIMEOUT_MINUTES } from "@/server/auth/session"

export const dynamic = "force-dynamic"
export const metadata = { title: "Your account" }

/**
 * Every signed-in admin can reach this, whatever their role: it only ever shows
 * and changes their own account, so it is not behind a permission the way the
 * rest of the back office is.
 */
export default async function AdminAccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/admin/login?next=/admin/account")
  const twoFactor = await twoFactorStatus("user", user.id)

  return (
    <div className="space-y-6">
      <PageHeader title="Your account" description="Security settings for your own admin sign-in." />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <TwoFactorCard initial={{ enabled: twoFactor.enabled, recoveryCodesLeft: twoFactor.recoveryCodesLeft }} />
        <section className="glass space-y-4 rounded-3xl p-6">
          <div>
            <p className="label-mono text-[11px] text-muted-foreground">Signed in as</p>
            <p className="mt-1 font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="label-mono text-[11px] text-muted-foreground">Role</p>
            <p className="mt-1 text-sm">{user.roleName}</p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="label-mono text-[11px] text-muted-foreground">Inactivity</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Admin sessions end after {ADMIN_IDLE_TIMEOUT_MINUTES} minutes without activity. Customer accounts are not
              affected.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

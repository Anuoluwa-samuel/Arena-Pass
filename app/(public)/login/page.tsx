import { Suspense } from "react"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/site/auth-form"
import { getSettings } from "@/server/services/settings"
import { getDefaultArena } from "@/server/services/arenas"
import { env } from "@/server/env"
import { getCurrentCustomer } from "@/server/auth/session"
import { safeNextPath } from "@/lib/safe-next"

export const metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Already signed in (e.g. Back after signing up, or an old link): don't show the form again.
  if (await getCurrentCustomer()) redirect(safeNextPath((await searchParams).next, "/account"))
  const settings = await getSettings((await getDefaultArena()).id)
  return (
    <Suspense>
      <AuthForm mode="login" siteName={settings.siteName} googleEnabled={env.googleEnabled} />
    </Suspense>
  )
}

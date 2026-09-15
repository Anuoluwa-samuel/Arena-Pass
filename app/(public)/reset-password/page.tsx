import { Suspense } from "react"
import type { Metadata } from "next"
import { ResetPasswordForm } from "@/components/site/reset-password-form"
import { getSettings } from "@/server/services/settings"
import { getDefaultArena } from "@/server/services/arenas"

// no-referrer: the URL carries a reset token; never leak it to another origin via the Referer header.
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" }

export default async function ResetPasswordPage() {
  const settings = await getSettings((await getDefaultArena()).id)
  return (
    <Suspense>
      <ResetPasswordForm siteName={settings.siteName} />
    </Suspense>
  )
}

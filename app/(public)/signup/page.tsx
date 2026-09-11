import { Suspense } from "react"
import { AuthForm } from "@/components/site/auth-form"
import { getSettings } from "@/server/services/settings"
import { getDefaultArena } from "@/server/services/arenas"

export const metadata = { title: "Create account" }

export default async function SignupPage() {
  const settings = await getSettings((await getDefaultArena()).id)
  return (
    <Suspense>
      <AuthForm mode="signup" siteName={settings.siteName} />
    </Suspense>
  )
}

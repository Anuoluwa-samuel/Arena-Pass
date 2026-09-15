import { Suspense } from "react"
import { AuthForm } from "@/components/site/auth-form"
import { getSettings } from "@/server/services/settings"
import { getDefaultArena } from "@/server/services/arenas"
import { env } from "@/server/env"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  const settings = await getSettings((await getDefaultArena()).id)
  return (
    <Suspense>
      <AuthForm mode="login" siteName={settings.siteName} googleEnabled={env.googleEnabled} />
    </Suspense>
  )
}

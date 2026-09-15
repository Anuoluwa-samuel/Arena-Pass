import { ForgotPasswordForm } from "@/components/site/forgot-password-form"
import { getSettings } from "@/server/services/settings"
import { getDefaultArena } from "@/server/services/arenas"

export const metadata = { title: "Forgot password" }

export default async function ForgotPasswordPage() {
  const settings = await getSettings((await getDefaultArena()).id)
  return <ForgotPasswordForm siteName={settings.siteName} />
}

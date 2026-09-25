import { Suspense } from "react"
import { redirect } from "next/navigation"
import { AdminLoginForm } from "@/components/admin/admin-login-form"
import { cookies } from "next/headers"
import { ADMIN_COOKIE, getCurrentUser, wasIdleTimeout } from "@/server/auth/session"
import { getSettings } from "@/server/services/settings"
import { getDefaultArena } from "@/server/services/arenas"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin sign in" }

export default async function AdminLoginPage() {
  if (await getCurrentUser()) redirect("/admin")
  const settings = await getSettings((await getDefaultArena()).id)
  // The stale cookie is still on the request after an idle sign-out, so the page
  // can tell a timeout apart from someone simply arriving at the sign-in form.
  const idleTimeout = await wasIdleTimeout((await cookies()).get(ADMIN_COOKIE)?.value)
  return (
    <Suspense>
      <AdminLoginForm siteName={settings.siteName} idleTimeout={idleTimeout} />
    </Suspense>
  )
}

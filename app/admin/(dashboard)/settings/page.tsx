import { PageHeader } from "@/components/shared/page-header"
import { SettingsForm } from "@/components/admin/settings-form"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { getSettings } from "@/server/services/settings"

export const metadata = { title: "System settings" }

export default async function SettingsPage() {
  const user = await requirePermission("settings.view")
  const settings = await getSettings(await resolveArenaId(user))
  return (
    <div className="space-y-6">
      <PageHeader title="System settings" description="Defaults for new sessions, booking behaviour and site identity. Changes apply immediately." />
      <SettingsForm initial={settings} canManage={user.permissions.includes("settings.manage")} />
    </div>
  )
}

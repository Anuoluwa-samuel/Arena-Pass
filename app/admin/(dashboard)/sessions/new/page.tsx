import { PageHeader } from "@/components/shared/page-header"
import { SessionForm } from "@/components/admin/session-form"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { getSettings } from "@/server/services/settings"

export const metadata = { title: "Create session" }

export default async function NewSessionPage() {
  const user = await requirePermission("sessions.manage")
  const settings = await getSettings(await resolveArenaId(user))
  return (
    <div className="space-y-6">
      <PageHeader title="Create session" description="Set the schedule, team structure and price. Publish now or save as a draft." />
      <SessionForm mode="create" defaults={{ teamsCount: settings.defaultTeamsCount, playersPerTeam: settings.defaultPlayersPerTeam, ticketPriceMajor: settings.defaultTicketPrice / 100, currency: settings.currency }} />
    </div>
  )
}

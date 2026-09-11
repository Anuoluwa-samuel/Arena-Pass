import { route, ok } from "@/server/http/response"
import { getSessionWithTeams } from "@/server/services/sessions"
import { toPublicSession, toPublicTeams } from "@/server/serializers"

export const GET = route(async (_req, { params }) => {
  const { id } = await params
  const { session, teams } = await getSessionWithTeams(id)
  return ok({ ...toPublicSession(session), teams: toPublicTeams(teams) }, { headers: { "Cache-Control": "no-store" } })
})

import { ok } from "@/server/http/response"
import { adminRoute, resolveArenaId } from "@/server/http/admin"
import { getRecentActivity } from "@/server/services/analytics"

export const GET = adminRoute("dashboard.view", async (_req, _ctx, user) => ok(await getRecentActivity(await resolveArenaId(user))))

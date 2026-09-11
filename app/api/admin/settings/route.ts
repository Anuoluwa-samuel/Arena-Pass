import { ok } from "@/server/http/response"
import { adminRoute, actorFrom, resolveArenaId } from "@/server/http/admin"
import { getSettings, settingsSchema, updateSettings } from "@/server/services/settings"
import { recordAudit } from "@/server/services/audit"

export const GET = adminRoute("settings.view", async (_req, _ctx, user) => ok(await getSettings(await resolveArenaId(user))))

export const PATCH = adminRoute("settings.manage", async (req, _ctx, user) => {
  const patch = settingsSchema.partial().parse(await req.json())
  const arenaId = await resolveArenaId(user)
  const settings = await updateSettings(patch, { arenaId, updatedBy: user.id })
  await recordAudit(actorFrom(user, req), { action: "settings.update", entityType: "settings", arenaId, description: `Updated system settings (${Object.keys(patch).join(", ")})` })
  return ok(settings, { message: "Settings saved" })
})

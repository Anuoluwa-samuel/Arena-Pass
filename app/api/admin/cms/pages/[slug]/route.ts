import { z } from "zod"
import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom, resolveArenaId } from "@/server/http/admin"
import { assertCmsSlug, discardDraft, getPage, publishPage, saveDraft } from "@/server/services/cms"

export const GET = adminRoute("cms.view", async (_req, { params }, user) => {
  const { slug } = await params
  return ok(await getPage(await resolveArenaId(user), assertCmsSlug(slug)))
})

export const PUT = adminRoute("cms.manage", async (req, { params }, user) => {
  const { slug } = await params
  const content = await req.json()
  return ok(await saveDraft(await resolveArenaId(user), assertCmsSlug(slug), content, { actor: actorFrom(user, req) }), { message: "Draft saved" })
})

export const POST = adminRoute("cms.manage", async (req, { params }, user) => {
  const { slug } = await params
  const { action } = await parseJson(req, z.object({ action: z.enum(["publish", "discard"]) }))
  const arenaId = await resolveArenaId(user)
  const page = action === "publish" ? await publishPage(arenaId, assertCmsSlug(slug), { actor: actorFrom(user, req) }) : await discardDraft(arenaId, assertCmsSlug(slug), { actor: actorFrom(user, req) })
  return ok(page, { message: action === "publish" ? "Page published" : "Draft discarded" })
})

import { ok } from "@/server/http/response"
import { parseJson } from "@/server/http/request"
import { adminRoute, actorFrom, resolveArenaId } from "@/server/http/admin"
import { listFaqs, createFaq, faqInputSchema } from "@/server/services/cms"

export const GET = adminRoute("cms.view", async (_req, _ctx, user) => ok(await listFaqs(await resolveArenaId(user))))

export const POST = adminRoute("cms.manage", async (req, _ctx, user) => {
  const input = await parseJson(req, faqInputSchema)
  return ok(await createFaq(await resolveArenaId(user), input, { actor: actorFrom(user, req) }), { status: 201, message: "Created" })
})

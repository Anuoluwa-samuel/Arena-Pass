import { route, ok } from "@/server/http/response"
import { getPublicSiteContent } from "@/server/services/public-content"

export const GET = route(async () => ok(await getPublicSiteContent(), { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }))

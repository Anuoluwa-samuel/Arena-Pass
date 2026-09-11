import { route, ok } from "@/server/http/response"
import { getCurrentUser } from "@/server/auth/session"

export const GET = route(async () => ok(await getCurrentUser()))

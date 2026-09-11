import { route, ok } from "@/server/http/response"
import { getCurrentCustomer } from "@/server/auth/session"

export const GET = route(async () => ok(await getCurrentCustomer()))

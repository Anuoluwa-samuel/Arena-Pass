import { route, ok } from "@/server/http/response"
import { handleProviderWebhook } from "@/server/services/payments"

/** Provider → server. Signature verified by the provider adapter; payload is then re-verified via the provider API. */
export const POST = route(async (req) => {
  const raw = await req.text()
  await handleProviderWebhook(raw, req.headers)
  return ok(null)
})

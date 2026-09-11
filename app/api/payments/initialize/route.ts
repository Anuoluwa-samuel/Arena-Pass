import { z } from "zod"
import { route, ok } from "@/server/http/response"
import { assertSameOrigin, parseJson } from "@/server/http/request"
import { initializePayment } from "@/server/services/payments"

export const POST = route(async (req) => {
  assertSameOrigin(req)
  const { bookingId } = await parseJson(req, z.object({ bookingId: z.string().uuid() }))
  const { payment, authorizationUrl } = await initializePayment(bookingId)
  return ok({ reference: payment.reference, authorizationUrl })
})

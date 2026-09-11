import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { createBookingSchema } from "@/lib/validation/bookings"
import { createBooking } from "@/server/services/bookings"
import { initializePayment } from "@/server/services/payments"
import { toPublicBooking } from "@/server/serializers"

/** Reserve a slot and start payment in one call so the customer sees a single step. */
export const POST = route(async (req) => {
  assertSameOrigin(req)
  const ip = getClientIp(req)
  await enforceRateLimit(RATE_LIMITS.booking, ip)
  const body = await parseJson(req, createBookingSchema)
  const created = await createBooking(body, { actor: { type: "customer", name: body.customer.name, ip } })
  const { authorizationUrl, payment } = await initializePayment(created.booking.id)
  return ok({ booking: toPublicBooking(created), payment: { reference: payment.reference, authorizationUrl } }, { status: created.reused ? 200 : 201, message: "Slot reserved" })
})

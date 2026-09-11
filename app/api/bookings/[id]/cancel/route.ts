import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp } from "@/server/http/request"
import { cancelPendingBooking } from "@/server/services/bookings"

export const POST = route(async (req, { params }) => {
  assertSameOrigin(req)
  const { id } = await params
  await cancelPendingBooking(id, { actor: { type: "customer", ip: getClientIp(req) } })
  return ok(null, { message: "Reservation released" })
})

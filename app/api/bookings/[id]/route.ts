import { route, ok } from "@/server/http/response"
import { getBookingById } from "@/server/services/bookings"
import { toPublicBookingDetail } from "@/server/serializers"

export const GET = route(async (_req, { params }) => {
  const { id } = await params
  return ok(toPublicBookingDetail(await getBookingById(id)), { headers: { "Cache-Control": "no-store" } })
})

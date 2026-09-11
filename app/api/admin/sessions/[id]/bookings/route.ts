import { ok } from "@/server/http/response"
import { adminRoute } from "@/server/http/admin"
import { listBookingsForSession } from "@/server/services/bookings"

export const GET = adminRoute("sessions.view", async (_req, { params }) => {
  const { id } = await params
  return ok(await listBookingsForSession(id))
})

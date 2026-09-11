import { route, ok } from "@/server/http/response"
import { getTicketByNumber, qrDataUrl } from "@/server/services/tickets"
import { getCurrentCustomer, getCurrentUser } from "@/server/auth/session"
import { forbidden } from "@/server/http/errors"
import { ticketAccessKey, toPublicTicket } from "@/server/serializers"
import { safeEqual } from "@/server/auth/tokens"

/**
 * A ticket is visible to its owner (customer session), to staff, or to
 * anyone holding the signed access key that is embedded in the ticket link.
 */
export const GET = route(async (req, { params }) => {
  const { ticketNumber } = await params
  const detail = await getTicketByNumber(ticketNumber.toUpperCase())
  const key = new URL(req.url).searchParams.get("k") ?? ""
  const [customer, user] = await Promise.all([getCurrentCustomer(), getCurrentUser()])
  const allowed = (customer && customer.id === detail.ticket.customerId) || (user && user.permissions.includes("tickets.view")) || (key && safeEqual(key, ticketAccessKey(detail.ticket.ticketNumber)))
  if (!allowed) throw forbidden("You do not have access to this ticket")
  return ok({ ...toPublicTicket(detail), qrImage: await qrDataUrl(detail.ticket.qrToken) }, { headers: { "Cache-Control": "private, no-store" } })
})

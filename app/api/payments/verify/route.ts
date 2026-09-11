import { z } from "zod"
import { route, ok } from "@/server/http/response"
import { parseQuery } from "@/server/http/request"
import { verifyPayment } from "@/server/services/payments"
import { ticketAccessKey } from "@/server/serializers"

/** Called by the callback page after the provider redirects back. Server-side verification only. */
export const GET = route(async (req) => {
  const { reference } = parseQuery(req, z.object({ reference: z.string().min(4).max(64) }))
  const outcome = await verifyPayment(reference)
  if (outcome.status === "PAID") {
    return ok({ status: "PAID", ticketNumber: outcome.ticket.ticketNumber, accessKey: ticketAccessKey(outcome.ticket.ticketNumber) })
  }
  return ok({ status: outcome.status, reason: outcome.status === "FAILED" ? outcome.payment.failureReason : null, bookingId: outcome.payment.bookingId })
})

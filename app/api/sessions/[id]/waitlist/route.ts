import { route, ok } from "@/server/http/response"
import { assertSameOrigin, getClientIp, parseJson } from "@/server/http/request"
import { enforceRateLimit, RATE_LIMITS } from "@/server/http/rate-limit"
import { waitlistSchema } from "@/lib/validation/bookings"
import { db, schema } from "@/server/db"
import { getSessionById } from "@/server/services/sessions"

export const POST = route(async (req, { params }) => {
  assertSameOrigin(req)
  await enforceRateLimit(RATE_LIMITS.signup, getClientIp(req))
  const { id } = await params
  const body = await parseJson(req, waitlistSchema)
  const session = await getSessionById(id)
  const database = await db()
  await database
    .insert(schema.waitlistEntries)
    .values({ sessionId: session.id, name: body.name, email: body.email.toLowerCase(), phone: body.phone || null })
    .onConflictDoNothing()
  return ok(null, { message: "You're on the waitlist. We'll email you if a slot opens up." })
})

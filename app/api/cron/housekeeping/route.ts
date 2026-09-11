import { route, ok } from "@/server/http/response"
import { env } from "@/server/env"
import { unauthorized } from "@/server/http/errors"
import { safeEqual } from "@/server/auth/tokens"
import { expireStaleBookings } from "@/server/services/bookings"
import { syncSessionLifecycle } from "@/server/services/sessions"

/** Scheduled job: release expired holds and persist session lifecycle transitions. */
export const POST = route(async (req) => {
  const auth = req.headers.get("authorization") ?? ""
  if (!env.CRON_SECRET || !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) throw unauthorized("Invalid cron secret")
  const [holds, lifecycle] = await Promise.all([expireStaleBookings(), syncSessionLifecycle()])
  return ok({ holds, lifecycle })
})

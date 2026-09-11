import { z } from "zod"
import { route, ok } from "@/server/http/response"
import { assertSameOrigin, parseJson } from "@/server/http/request"
import { env } from "@/server/env"
import { AppError } from "@/server/http/errors"
import { setMockOutcome } from "@/server/payments/mock"

/** Development only: records the tester's chosen outcome for the mock provider. */
export const POST = route(async (req) => {
  assertSameOrigin(req)
  if (env.PAYMENT_PROVIDER !== "mock") throw new AppError("NOT_FOUND", "Not found")
  const body = await parseJson(req, z.object({ reference: z.string().min(4), outcome: z.enum(["success", "failed"]) }))
  const row = await setMockOutcome(body.reference, body.outcome)
  if (!row) throw new AppError("PAYMENT_NOT_FOUND", "Payment not found")
  return ok({ reference: row.reference })
})

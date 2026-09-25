import { route, ok } from "@/server/http/response"
import { assertSameOrigin } from "@/server/http/request"
import { beginTwoFactorEnrolment } from "@/server/auth/two-factor"
import { requirePrincipal } from "@/server/auth/principal"

/** Step one of enrolment: mint a secret and return the QR code to scan. */
export const POST = route(async (req) => {
  assertSameOrigin(req)
  const { principalType, id } = await requirePrincipal()
  const { uri, qrImage, secret } = await beginTwoFactorEnrolment(principalType, id)
  // The secret is returned alongside the QR so it can be typed in by hand on a
  // device that cannot scan; it is worthless until a code confirms enrolment.
  return ok({ uri, qrImage, secret })
})

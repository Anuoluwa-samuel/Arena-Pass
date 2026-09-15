import { NextResponse } from "next/server"
import { env } from "@/server/env"
import { beginGoogleSignIn } from "@/server/auth/google"
import { safeNextPath } from "@/lib/safe-next"

/** Full-page hop from the "Continue with Google" button to Google's consent screen. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (!env.googleEnabled) return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url))
  return NextResponse.redirect(await beginGoogleSignIn(safeNextPath(url.searchParams.get("next"))))
}

import { NextResponse, type NextRequest } from "next/server"

/**
 * Edge guard: admin pages need the admin cookie, account pages need the
 * customer cookie. This is a UX redirect only — real authorisation happens
 * in route handlers and server components (server/auth/rbac.ts).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!req.cookies.get("ap_admin_session")?.value) {
      const url = req.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }
  if (pathname.startsWith("/account")) {
    if (!req.cookies.get("ap_customer_session")?.value) {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
}

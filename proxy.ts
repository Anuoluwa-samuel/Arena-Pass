import { NextResponse, type NextRequest } from "next/server"

/**
 * Report-only while we learn what the live site loads: violations are logged
 * to /api/csp-report instead of blocked. Flip to enforcing once the reports
 * are quiet.
 */
const CSP_HEADER = "Content-Security-Policy-Report-Only"

/**
 * Scripts must carry this request's nonce (Next.js stamps it on its own
 * scripts by reading the CSP request header); 'strict-dynamic' then trusts
 * whatever those load, such as Vercel Analytics. Styles stay 'unsafe-inline':
 * React style props and the UI libraries depend on inline styles, and adding a
 * nonce to style-src would make browsers ignore 'unsafe-inline' entirely.
 * Images allow any https host because CMS editors may link external images.
 */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development"
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "report-uri /api/csp-report",
  ].join("; ")
}

/**
 * Edge guard: admin pages need the admin cookie, account pages need the
 * customer cookie. This is a UX redirect only — real authorisation happens
 * in route handlers and server components (server/auth/rbac.ts).
 */
function authRedirect(req: NextRequest) {
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
  return null
}

export function proxy(req: NextRequest) {
  const redirect = authRedirect(req)
  if (redirect) return redirect

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const policy = contentSecurityPolicy(nonce)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set(CSP_HEADER, policy)
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set(CSP_HEADER, policy)
  return res
}

export const config = {
  matcher: [
    {
      // Pages only: API routes, build assets and public files need no CSP.
      source: "/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|txt|xml|webmanifest)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}

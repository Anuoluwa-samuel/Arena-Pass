import "server-only"
import { cookies } from "next/headers"
import { env } from "@/server/env"
import type { PrincipalType } from "./two-factor"

export { createTwoFactorChallenge, consumeTwoFactorChallenge, isTwoFactorEnabled } from "./two-factor"

/**
 * The cookie that carries a half-finished sign-in between the password step and
 * the code step. Kept apart from the session cookies on purpose: it is not a
 * credential for anything, it only names which pending challenge is being
 * answered, and it disappears as soon as the challenge is consumed.
 */
export const ADMIN_2FA_COOKIE = "ap_admin_2fa"
export const CUSTOMER_2FA_COOKIE = "ap_customer_2fa"

export function twoFactorCookieName(principalType: PrincipalType) {
  return principalType === "user" ? ADMIN_2FA_COOKIE : CUSTOMER_2FA_COOKIE
}

export async function setTwoFactorChallengeCookie(principalType: PrincipalType, challenge: { token: string; ttlMs: number }) {
  const store = await cookies()
  store.set(twoFactorCookieName(principalType), challenge.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: Math.floor(challenge.ttlMs / 1000),
  })
}

export async function readTwoFactorChallengeCookie(principalType: PrincipalType) {
  return (await cookies()).get(twoFactorCookieName(principalType))?.value
}

export async function clearTwoFactorChallengeCookie(principalType: PrincipalType) {
  const store = await cookies()
  store.set(twoFactorCookieName(principalType), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: 0,
  })
}

# Security

## Controls

| Area | Control |
| --- | --- |
| Authentication | scrypt password hashing (N=16384), constant-time comparison, timing-safe login (hash always computed), server-side sessions with SHA-256 token storage, httpOnly + SameSite=Lax + Secure cookies, revocation on logout/role change/password change/deactivation |
| Password reset (customers) | 256-bit random token, only its SHA-256 stored; single use (claimed by conditional UPDATE), 30-minute expiry, a new request retires older links; identical response and timing for unknown emails (lookup only, issue + send in `after()`); link emailed directly, never persisted in the admin-visible notifications table; reset revokes all sessions; reset page sends `Referrer-Policy: no-referrer` and strips the token from the address bar |
| Google sign-in (customers) | OIDC authorization-code flow with PKCE (S256), `state` and `nonce` in a 10-minute httpOnly cookie scoped to the callback path; ID token claims checked (`iss`, `aud`/`azp`, `exp`, `nonce`, `email_verified`); accounts keyed by Google `sub`; first link to an existing password account clears that password and revokes its sessions (sign-up doesn't verify email, so a pre-registered password may not be the owner's); `next` redirects restricted to same-site paths |
| Authorisation | DB-stored role → permission map; `requirePermission()` in every admin route handler and server component; super-admin-only guards for role escalation; users cannot demote/disable themselves |
| CSRF | Origin/Host check on every cookie-authenticated mutation (`assertSameOrigin`) plus SameSite cookies |
| Rate limiting | Login (per IP and per email), signup, booking creation, ticket validation, uploads |
| Input validation | zod at the API boundary, business checks in services, CHECK/UNIQUE constraints in Postgres |
| SQL injection | Drizzle parameterised queries; raw SQL only via tagged templates |
| XSS | React escaping; CMS content rendered as text (no HTML injection); SVG uploads rejected if they contain `<script>` |
| Uploads | Magic-byte content sniffing, allow-list of image types, size limit, random file names, path traversal guard in the storage adapter, `nosniff` when serving |
| Payments | Card data never handled; provider verification server-side; amount + currency equality check; webhook signature verification (HMAC-SHA512) then re-verification via API; idempotent confirmation |
| Tickets | Random 24-byte `qr_token` + HMAC in the QR payload; signed access key for ticket links; conditional UPDATE prevents double admission; refunded/cancelled tickets rejected at the gate |
| Overselling | Row lock + `SKIP LOCKED` slot claim + capacity CHECK + unique slot/booking/ticket indexes |
| Secrets | `.env*` git-ignored; `server/env.ts` fails fast when production secrets are missing; mock provider forbidden in production |
| Headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, no `X-Powered-By` |
| Information exposure | Internal errors return a generic message and are logged server-side; customer emails masked in public booking responses; passwords never serialised |
| Audit | Login/logout, session, ticket, payment, CMS, user, role and settings changes recorded with actor and IP |

## Known limitations / next steps

- Rate limiting is per instance; use a Redis-backed store for multi-instance deployments.
- Admin users have no self-service password reset (admins reset each other's passwords from the Administrators page).
- Customer sign-up does not verify email ownership. Password reset and Google sign-in both prove it, which is why they revoke sessions and why linking Google clears an earlier password.
- Consider a Content-Security-Policy header once third-party scripts are finalised.
- Enable 2FA for SUPER_ADMIN accounts before handling live payments.

# Security

## Controls

| Area | Control |
| --- | --- |
| Authentication | scrypt password hashing (N=16384), constant-time comparison, timing-safe login (hash always computed), server-side sessions with SHA-256 token storage, httpOnly + SameSite=Lax + Secure cookies, revocation on logout/role change/password change/deactivation |
| Password reset (customers) | 256-bit random token, only its SHA-256 stored; single use (claimed by conditional UPDATE), 30-minute expiry, a new request retires older links; identical response and timing for unknown emails (lookup only, issue + send in `after()`); link emailed directly, never persisted in the admin-visible notifications table; reset revokes all sessions; reset page sends `Referrer-Policy: no-referrer` and strips the token from the address bar |
| Google sign-in (customers) | OIDC authorization-code flow with PKCE (S256), `state` and `nonce` in a 10-minute httpOnly cookie scoped to the callback path; ID token claims checked (`iss`, `aud`/`azp`, `exp`, `nonce`, `email_verified`); accounts keyed by Google `sub`; first link to an existing password account clears that password and revokes its sessions (sign-up doesn't verify email, so a pre-registered password may not be the owner's); `next` redirects restricted to same-site paths |
| Two-factor authentication (optional, both admins and customers) | TOTP (RFC 6238, SHA-1/6-digit/30s) verified in constant time with a ±1 step window; secrets stored AES-256-GCM encrypted under a key derived from `SESSION_SECRET` via HKDF, never in the clear; enrolment only takes effect once a code is confirmed; the password step issues a single-use 5-minute challenge rather than a session, so a correct password alone grants nothing; 10 single-use recovery codes stored as SHA-256 and claimed by conditional UPDATE; turning 2FA off or reissuing recovery codes requires a current code; dedicated rate-limit bucket (8 per 15 minutes) |
| Session lifetime | Admin sessions expire 12h after sign-in and after 30 minutes idle, enforced in `findLiveSession()` so no route can skip it; the idle revocation records its reason so the sign-in page can explain it. Customer sessions are deliberately long-lived (30 days) and not idle-limited |
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
- Two-factor authentication is opt-in. Consider requiring it for SUPER_ADMIN accounts before handling live payments, rather than leaving it to each admin.
- An admin who loses both their authenticator and their recovery codes needs another super admin to clear `totp_secret`/`totp_enabled_at` for them; there is no self-service path yet.
- `SESSION_SECRET` now protects stored TOTP secrets, so rotating it stops enrolled authenticator apps working and forces re-enrolment. Recovery codes survive it (they are hashed, and the sign-in path treats an unreadable secret as a failed code rather than an error), so it degrades to "everyone uses a recovery code once" rather than a lockout. See docs/DEPLOYMENT.md.
- Customers have no admin-side 2FA reset, unlike admins. A customer who loses their authenticator *and* all ten recovery codes cannot get back in without direct database access.

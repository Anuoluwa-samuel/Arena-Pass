# Security

## Controls

| Area | Control |
| --- | --- |
| Authentication | scrypt password hashing (N=16384), constant-time comparison, timing-safe login (hash always computed), server-side sessions with SHA-256 token storage, httpOnly + SameSite=Lax + Secure cookies, revocation on logout/role change/password change/deactivation |
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
- No password reset flow yet (admins reset passwords from the Administrators page; customers should be given a reset link flow before launch).
- Consider a Content-Security-Policy header once third-party scripts are finalised.
- Enable 2FA for SUPER_ADMIN accounts before handling live payments.

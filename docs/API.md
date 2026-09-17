# API

All responses use one envelope:

```json
{ "success": true, "data": {}, "message": "optional", "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
{ "success": false, "message": "Session is already full", "code": "SESSION_FULL", "details": [] }
```

Error codes: `SESSION_NOT_FOUND`, `SESSION_FULL`, `SESSION_NOT_BOOKABLE`, `BOOKING_NOT_OPEN`, `BOOKING_CLOSED`, `BOOKING_NOT_FOUND`, `BOOKING_EXPIRED`, `BOOKING_ALREADY_CONFIRMED`, `DUPLICATE_BOOKING`, `INVALID_TICKET`, `TICKET_NOT_FOUND`, `TICKET_ALREADY_USED`, `TICKET_NOT_VALID`, `TICKET_WRONG_SESSION`, `PAYMENT_FAILED`, `PAYMENT_PENDING`, `PAYMENT_NOT_FOUND`, `PAYMENT_PROVIDER_ERROR`, `UNAUTHORIZED` (401), `FORBIDDEN` (403), `VALIDATION_ERROR` (422, with `details[]`), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`, `EMAIL_TAKEN`, `INTERNAL_ERROR` (500).

Mutations from the browser are cookie-authenticated and must be same-origin (Origin header checked).

## Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | DB round-trip |
| GET | `/api/sessions` | Public, bookable/upcoming sessions. `?q&from&to&page&pageSize` |
| GET | `/api/sessions/:id` | Session + team board (slot taken/free only) |
| POST | `/api/sessions/:id/waitlist` | `{ name, email, phone? }` |
| POST | `/api/bookings` | `{ sessionId, customer:{name,email,phone?}, playerName?, preferredTeamNumber?, idempotencyKey }` → booking + `payment.authorizationUrl`. Rate limited |
| GET | `/api/bookings/:id` | Booking state (email masked) |
| POST | `/api/bookings/:id/cancel` | Release a pending hold |
| POST | `/api/payments/initialize` | `{ bookingId }` → new/reused authorization URL |
| GET | `/api/payments/verify?reference=` | Server-side verification; `PAID` returns `ticketNumber` + `accessKey`. `REFUND_REQUIRED` means the charge succeeded after the hold expired and the session filled: no ticket, admins alerted (email + in-app + dashboard banner), refunded from Payments → Needs refund |
| POST | `/api/payments/webhook` | Provider webhook; signature verified by the adapter. Charge events are re-verified with the provider; other validly signed events (refunds, transfers) get 200 so the provider stops retrying |
| POST | `/api/payments/mock/complete` | Dev only (`PAYMENT_PROVIDER=mock`) |
| GET | `/api/tickets/:ticketNumber?k=` | Ticket + QR image. Owner, staff, or signed access key |
| GET | `/api/cms/public` | Published content bundle for the site |
| GET | `/api/media/files/*` | Locally stored uploads |
| POST | `/api/cron/housekeeping` | `Authorization: Bearer $CRON_SECRET` — expire holds, sync lifecycle |

## Auth

| Method | Path |
| --- | --- |
| POST | `/api/auth/login` · `/api/auth/logout` · GET `/api/auth/me` (admin) |
| POST | `/api/auth/customer/signup` · `/customer/login` · `/customer/logout` · GET `/customer/me` |
| POST | `/api/auth/customer/password/forgot` `{ email }` — always the same 200 response; emails a single-use link valid for 30 minutes |
| POST | `/api/auth/customer/password/reset` `{ token, password }` — sets the password, revokes every session, signs in. `INVALID_RESET_TOKEN` if used/expired |
| GET | `/api/auth/customer/google?next=` → Google consent · `/customer/google/callback` (OIDC code flow + PKCE). Only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set; failures redirect to `/login?error=` |
| GET | `/api/me/tickets` (customer) |

Login endpoints are rate limited per IP and per email. Reset requests are limited per IP and per email; reset submissions and Google callbacks per IP.

## Admin (`/api/admin/*`, permission in brackets)

| Method | Path | Permission |
| --- | --- | --- |
| GET/POST | `/sessions` | sessions.view / sessions.manage |
| GET/PATCH/DELETE | `/sessions/:id` | sessions.view / manage |
| POST | `/sessions/:id/publish` · `/unpublish` · `/cancel` `{reason}` | sessions.manage |
| GET | `/sessions/:id/bookings` | sessions.view |
| GET | `/tickets` | tickets.view |
| POST | `/tickets/validate` `{ code, mode: check\|admit, sessionId? }` | tickets.validate |
| POST | `/tickets/:id/cancel` `{reason}` | tickets.manage |
| GET | `/customers` · GET/PATCH `/customers/:id` | customers.view / manage |
| GET | `/payments` · `/payments/transactions` | payments.view |
| POST | `/payments/:id/refund` `{reason}` | tickets.refund |
| GET | `/analytics/overview?days=` · `/analytics/activity` | dashboard.view |
| GET/PUT/POST | `/cms/pages/:slug` (PUT = save draft, POST `{action: publish\|discard}`) | cms.view / manage |
| GET/POST, PATCH/DELETE `:id`, POST `/reorder` | `/cms/services` · `/cms/faqs` · `/cms/banners` | cms.view / manage |
| GET/POST, PATCH/DELETE `:id` | `/cms/announcements` | cms.view / manage |
| GET/POST (multipart `file`, `folder`, `altText`) · PATCH/DELETE `:id` | `/media` | media.view / manage |
| GET/POST · PATCH/DELETE `:id` | `/users` | users.view / manage |
| GET | `/roles` · PUT `/roles/:key/permissions` | users.view / roles.manage |
| GET · POST `:id/retry` | `/notifications` | notifications.view / manage |
| GET/PATCH | `/settings` | settings.view / manage |
| GET | `/audit-logs` | audit.view |

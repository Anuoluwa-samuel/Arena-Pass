# Deployment

## Environments

| | Development | Staging | Production |
| --- | --- | --- | --- |
| Database | PGlite in `.data/pglite` | Managed Postgres | Managed Postgres (with backups, `sslmode=require`) |
| Payments | `mock` | `paystack` (test keys) | `paystack` (live keys) |
| Email | `console` | `resend` | `resend` |
| Secrets | dev defaults | real | real, rotated |

`server/env.ts` validates configuration at boot and refuses to start production with the mock provider or missing secrets.

## Required production variables

```
NODE_ENV=production
APP_URL=https://tickets.example.com
DATABASE_URL=postgres://…?sslmode=require
SESSION_SECRET=<openssl rand -hex 32>
QR_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 16>
PAYMENT_PROVIDER=paystack
PAYSTACK_SECRET_KEY=sk_live_…
PAYSTACK_PUBLIC_KEY=pk_live_…
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_…
EMAIL_FROM="Arena Pass <tickets@example.com>"
BOOTSTRAP_ADMIN_EMAIL=owner@example.com      # first boot only
BOOTSTRAP_ADMIN_PASSWORD=<strong password>   # change after first login
```

Never commit `.env*` (only `.env.example`). Rotating `QR_SECRET` invalidates existing QR codes and ticket links; rotating `SESSION_SECRET` is safe (sessions are database-backed).

## Steps

1. Provision Postgres; set `DATABASE_URL`.
2. `npm ci && npm run build`.
3. Migrations run automatically on first request (or run `npm run db:migrate` in a release step for zero-surprise deploys).
4. Start with `npm start` (or deploy to Vercel / any Node host). Keep `serverExternalPackages` as configured.
5. Paystack dashboard → Settings → Webhooks: `https://<host>/api/payments/webhook`. Callback URL is set per transaction.
6. Schedule `POST /api/cron/housekeeping` with `Authorization: Bearer $CRON_SECRET` every 1–5 minutes (Vercel Cron, GitHub Actions, or system cron). It releases expired holds and persists session lifecycle transitions.
7. Media: the local storage adapter writes to `UPLOAD_DIR`. On serverless hosts implement the S3-compatible adapter (`server/storage/`) before enabling uploads.

## Scaling notes

- Stateless app servers: sessions, rate-limit buckets and holds live in the database (rate limiting is in-memory per instance; swap `RateLimitStore` for Redis when running many instances).
- Public session listing responses are cacheable for 15 s; everything else is `no-store`.
- Indexes cover the hot paths: sessions by arena + start, tickets by session/customer, bookings by status + expiry, audit logs by time.

## Health and monitoring

- `GET /api/health` for load-balancer checks.
- Logs are JSON lines in production; ship `level=error` events (`http.unhandled`, `payment.amount_mismatch`, `payment.post_confirm_failed`, `notification.failed`) to your alerting.
- Audit logs in the admin cover every administrative action.

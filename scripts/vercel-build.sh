#!/usr/bin/env bash
# Vercel build: apply database migrations (and the baseline admin/content) for
# production deploys before building, so the first request never races a migration.
# Preview deploys skip it so they can't change the production database.
set -euo pipefail
if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is not set for Production. Add a Postgres database (Vercel Storage → Neon) and redeploy." >&2
    exit 1
  fi
  echo "Applying database migrations…"
  NODE_ENV=production npm run db:migrate
fi
npm run build

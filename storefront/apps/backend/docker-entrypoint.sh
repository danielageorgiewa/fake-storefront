#!/usr/bin/env sh
# Backend container startup: run DB migrations (idempotent) before launching the
# server, so the schema is always current on `docker compose up`.
#
# `medusa db:migrate` also runs tracked data-migration scripts under
# src/migration-scripts/ — which includes initial-data-seed.ts — so the database
# is migrated AND seeded (regions, products, etc.) on first boot, exactly once.
# No separate seed step is needed.
set -e

cd /app/apps/backend

echo "→ Running database migrations (and first-run data seed)…"
npx medusa db:migrate

cd /app
exec "$@"

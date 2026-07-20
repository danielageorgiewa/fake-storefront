#!/usr/bin/env sh
# Backend container startup: run DB migrations (idempotent) before launching the
# server, so the schema is always current on `docker compose up`. Optionally seed
# sample data on first boot with SEED_ON_START=true.
set -e

cd /app/apps/backend

echo "→ Running database migrations…"
npx medusa db:migrate

if [ "$SEED_ON_START" = "true" ]; then
  echo "→ Seeding sample data…"
  npx medusa exec ./src/migration-scripts/initial-data-seed.ts
fi

cd /app
exec "$@"

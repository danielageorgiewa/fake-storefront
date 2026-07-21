# Docker (local development)

A three-service Docker Compose stack for running the whole app locally:

| Service      | Image / build            | Port  | Notes                                    |
| ------------ | ------------------------ | ----- | ---------------------------------------- |
| `postgres`   | `postgres:15`            | 5432  | Persistent named volume `pgdata`         |
| `backend`    | `apps/backend/Dockerfile`| 9000  | Medusa v2 (`medusa develop`), auto-migrates on start |
| `storefront` | `apps/storefront/Dockerfile` | 8000 | Next.js 15 (`next dev`)               |

These are **development** images: your source is bind-mounted into the containers
for hot reload. This is not a production build.

Config lives in the root [`.env`](./.env) (dev-only defaults). It's shared by both
app containers and auto-loaded by Compose.

> Note: the repo's root `.gitignore` ignores `**/.env`, so this file is not tracked
> by default. Use `git add -f .env` if you want to commit the defaults.

---

## One-time setup

### 1. Add the backend host alias

The storefront reads a single backend URL (`NEXT_PUBLIC_MEDUSA_BACKEND_URL`) that
must resolve from **both** the browser (on your Mac) and the storefront container's
server-side code. We use the hostname `medusa-backend` for both:

- Inside the container it's mapped to the Docker host gateway (`extra_hosts` in
  `docker-compose.yml`), reaching the host-published backend on port 9000.
- On your Mac, add it to `/etc/hosts` so the browser resolves it too:

```bash
echo "127.0.0.1 medusa-backend" | sudo tee -a /etc/hosts
```

### 2. Bootstrap the backend & publishable key

The storefront **will not start** without `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
(its `next.config.js` hard-exits if the key is missing), and that key is created by
the backend — so bring the backend up first:

```bash
# Start Postgres + backend. On startup the entrypoint runs `medusa db:migrate`,
# which applies the schema AND runs the first-run data seed (regions, products,
# etc.) via src/migration-scripts/initial-data-seed.ts — so no separate seed
# step is needed; the storefront will have content out of the box.
docker compose up -d postgres backend

# Watch until the backend is healthy / listening on :9000
docker compose logs -f backend

# Create an admin user for the dashboard
docker compose exec backend npx medusa user -e admin@test.com -p supersecret
```

Then grab the publishable key:

1. Open <http://localhost:9000/app> and log in (`admin@test.com` / `supersecret`).
2. Go to **Settings → Publishable API keys** and copy the key (`pk_...`).
3. Paste it into `.env` as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...`.

### 3. Start the storefront

```bash
docker compose up -d storefront
# or bring up everything together:
docker compose up
```

Open <http://localhost:8000> — you'll be redirected to a country-prefixed URL
(e.g. `/dk`).

---

## Everyday commands

```bash
docker compose up                # start all three (foreground)
docker compose up -d             # start all three (detached)
docker compose logs -f backend   # tail a service's logs
docker compose exec backend sh   # shell into the backend container
docker compose down              # stop; DB data persists (pgdata volume)
docker compose down -v           # stop AND wipe all volumes (fresh DB — you'll
                                 # need to re-seed and re-copy the publishable key)
docker compose build             # rebuild images after changing a Dockerfile or
                                 # adding a dependency (package.json)
```

Migrations run automatically every time the backend container starts (idempotent),
so schema changes are picked up on `docker compose up`.

---

## Notes & gotchas

- **Secrets are dev-only.** `JWT_SECRET`, `COOKIE_SECRET`, and the Postgres
  password in `.env` are placeholders — never reuse them anywhere real.
- **`apps/backend/.env` is ignored inside the container.** Compose sets
  `DATABASE_URL` (and CORS/secrets) via `.env`, and Medusa's `loadEnv` (dotenv)
  does not override variables already in the environment — so the container talks
  to the `postgres` service, not whatever your local `.env` points at.
- **No Redis.** `medusa-config.ts` doesn't wire in `REDIS_URL`, so the stack runs
  without it (Medusa uses its in-memory event bus / workflow engine locally).
- **Adding dependencies?** Rebuild the affected image (`docker compose build
  backend` / `storefront`) so `npm ci` picks up the new lockfile.

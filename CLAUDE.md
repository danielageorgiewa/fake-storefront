# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The repo root (`fake-storefront/`) is an onboarding exercise wrapper. All actual
code lives in the `storefront/` Turborepo, which contains two npm-workspace apps:

- `storefront/apps/backend` — `@dtc/backend`, a Medusa v2 commerce backend (admin + Store/Admin APIs, port 9000)
- `storefront/apps/storefront` — `@dtc/storefront`, a Next.js 15 App Router frontend (port 8000)

Run all commands from `storefront/` unless noted. **This is an npm workspaces +
Turborepo monorepo** (`packageManager: npm@11.17.0`, lockfile `package-lock.json`).
Ignore any `pnpm` instructions in the README files — they are inherited from the
upstream Medusa starter and do not match this repo's tooling.

## Commands

From `storefront/` (Turbo fans these out to both apps):

```bash
npm install              # install all workspaces
npm run dev              # run backend + storefront together
npm run build            # build all (backend build depends on ^build)
npm run lint             # lint all
npm run test             # test all

npm run backend:dev      # backend only (turbo --filter=@dtc/backend)
npm run storefront:dev   # storefront only
npm run backend:seed     # seed the backend database
```

Backend-specific (from `storefront/apps/backend`, uses Medusa CLI):

```bash
npm run dev                      # medusa develop
npx medusa db:migrate            # run migrations
npx medusa user -e admin@test.com -p supersecret   # create admin user
npm run test:unit                # unit tests  (*.unit.spec.ts under src/**/__tests__)
npm run test:integration:http    # HTTP integration tests (integration-tests/http/*.spec.ts)
npm run test:integration:modules # module integration tests (src/modules/*/__tests__)
```

Jest test selection is driven by the `TEST_TYPE` env var (see
`apps/backend/jest.config.js`), which the scripts above set. To run a single
test, append a Jest name/path filter, e.g.
`npm run test:unit -- path/to/file.unit.spec.ts -t "test name"`.

Storefront lints/builds with Next.js (`next lint`, `next build`); there is no
storefront test suite.

## Environment setup

Neither app runs without env files and a running Postgres database.

- Backend: `cp apps/backend/.env.template apps/backend/.env`, then set
  `DATABASE_URL`. Requires Postgres v15+ (and optionally Redis). CORS, JWT, and
  cookie secrets are read from this file via `medusa-config.ts`.
- Storefront: create `apps/storefront/.env.local` with
  `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (obtain it from the admin dashboard at
  `localhost:9000/app` → Settings → Publishable API key). Optional:
  `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (default `http://localhost:9000`),
  `NEXT_PUBLIC_DEFAULT_REGION` (default `dk`), `NEXT_PUBLIC_STRIPE_KEY`.

Bootstrapping order matters: start the backend, migrate, create an admin user,
grab the publishable key, then configure and start the storefront.

## Architecture

**Backend (Medusa v2, `apps/backend/src/`).** Follows Medusa's framework
conventions — extend, don't rewrite. Custom logic goes in the conventional
directories: `api/` (route handlers under `admin/custom` and `store/custom`),
`modules/` (custom commerce modules), `workflows/`, `subscribers/` (event
handlers), `jobs/` (scheduled), `links/` (module associations), and `admin/`
(dashboard extensions). Config is `medusa-config.ts`.

**Storefront (Next.js App Router, `apps/storefront/src/`).** Multi-region by
design:

- Routing is namespaced under `app/[countryCode]/`, split into route groups
  `(main)` and `(checkout)`. Every user-facing path is country-scoped.
- `middleware.ts` performs region detection: it fetches the region map from the
  backend's `/store/regions` (cached ~1h), infers the country from the request,
  and redirects to the correct `[countryCode]` prefix. It calls the backend via
  raw `fetch` (not the JS SDK) because middleware runs on the Edge runtime.
- `lib/data/*.ts` are the server-side data-access modules (cart, products,
  regions, customer, orders, payment, etc.) — the boundary between the Next.js
  app and the Medusa Store API. Prefer extending these over calling the backend
  directly from components.
- `modules/` holds feature-oriented UI (cart, checkout, products, account,
  collections, categories, order, store, home, layout, plus `common` and
  `skeletons`). `lib/context`, `lib/hooks`, `lib/util` hold shared client state
  and helpers.

## Note on the top-level README

The repo-root `README.md` describes an aspirational goal (French/Spanish
`demo-fr`/`demo-es` storefronts, Docker packaging, ~20 sample products). The
scaffolded code is the upstream Medusa DTC starter and does not yet implement
that; treat the root README as intent, and `storefront/README.md` as the
accurate setup guide (modulo the pnpm/npm discrepancy noted above).

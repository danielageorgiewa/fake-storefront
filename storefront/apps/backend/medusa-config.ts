import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Explicit connection-pool config. Without it, `medusa db:migrate` can
    // deadlock during bootstrap — the migration runner holds its one connection
    // while a nested query waits for another, and with the effective pool
    // behaving as size ~1 the acquire never resolves (surfaces as
    // "KnexTimeoutError: Timeout acquiring a connection. The pool is probably
    // full."). Forcing min/max > 1 breaks the circular wait. `ssl: false` is for
    // local (non-SSL) Postgres. Do not remove without re-testing migrations.
    databaseDriverOptions: {
      connection: { ssl: false },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        createRetryIntervalMillis: 100,
      },
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  }
})

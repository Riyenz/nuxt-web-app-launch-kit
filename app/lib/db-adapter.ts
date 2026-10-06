import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { retryPreparedStatementRace } from './prepared-statement-race'

// Neon's serverless driver speaks over WebSocket/HTTP and is what production
// uses. Anything else — a local `prisma dev` PGlite server, a plain Postgres
// (including the CI service container), or a `prisma+postgres://localhost` dev
// URL — goes through the node-postgres adapter, which also knows how to
// transform local `prisma+postgres` URLs.
function isNeonUrl(url: string) {
  return /neon\.tech/i.test(url)
}

// `prisma dev ls` advertises each server as a `prisma+postgres://` URL, and
// that is the string it labels "DATABASE_URL" — so it is what ends up pasted
// into .env. node-postgres cannot speak that protocol: it would open a raw
// Postgres connection against the HTTP port and fail every query with
// "Connection terminated unexpectedly". The real TCP connection string is
// carried inside the api_key as base64url-encoded JSON, so unwrap it first.
// `.paseo/local-db.mjs` decodes the same payload when it rewrites .env.
function resolvePostgresUrl(url: string) {
  if (!url.startsWith('prisma+postgres:')) {
    return url
  }

  const apiKey = new URL(url).searchParams.get('api_key')
  let databaseUrl: unknown

  if (apiKey) {
    try {
      databaseUrl = JSON.parse(Buffer.from(apiKey, 'base64url').toString('utf-8')).databaseUrl
    } catch {
      // A hosted Prisma Postgres key is a JWT, not a local server payload.
      databaseUrl = undefined
    }
  }

  if (typeof databaseUrl !== 'string') {
    throw new Error(
      'DATABASE_URL is a prisma+postgres:// URL with no embedded Postgres connection string. '
      + 'For a local server, use the TCP URL that `prisma dev` prints (postgres://...); '
      + 'hosted Prisma Postgres is not supported by this adapter.'
    )
  }

  // Drop Prisma's pool tuning parameters, matching `.paseo/local-db.mjs`.
  const parsed = new URL(databaseUrl)
  parsed.search = 'sslmode=disable'
  return parsed.toString()
}

function withPreparedStatementRetry(pool: pg.Pool) {
  const originalQuery = pool.query.bind(pool) as (...args: unknown[]) => Promise<unknown>

  pool.query = function queryWithRetry(...args: unknown[]) {
    if (typeof args[args.length - 1] === 'function') {
      return originalQuery(...args)
    }

    return retryPreparedStatementRace(function runQuery() {
      return originalQuery(...args)
    })
  } as typeof pool.query

  return pool
}

export function createDbAdapter(connectionString: string | undefined = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  if (isNeonUrl(connectionString)) {
    return new PrismaNeon({ connectionString })
  }

  // `prisma dev` multiplexes every TCP connection onto a single PGlite session
  // (they share one backend pid), so a multi-connection pool lets concurrent
  // queries overwrite each other's unnamed prepared statement — Postgres then
  // rejects the bind with 08P01. Defaulting to max: 1 keeps every local path
  // serialized. CI opts out with DB_POOL_MAX against a real Postgres that can
  // use a real pool; a PGlite URL and a service-container URL are both
  // postgres://…@localhost, so they cannot be told apart by scheme.
  //
  // max: 1 only serializes queries inside one process. Local e2e still opens a
  // second client from the Playwright helper, and those two connections share
  // the unnamed prepared-statement slot. Retrying 08P01 is the cross-process
  // complement: the next attempt binds after the other connection has moved on.
  const max = process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 1
  const pool = withPreparedStatementRetry(new pg.Pool({
    connectionString: resolvePostgresUrl(connectionString),
    max
  }))
  // @prisma/adapter-pg pins @types/pg@8.11 while this app uses 8.16. Same runtime driver.
  const adapterPool = pool as unknown as ConstructorParameters<typeof PrismaPg>[0]
  return new PrismaPg(adapterPool, { disposeExternalPool: true })
}

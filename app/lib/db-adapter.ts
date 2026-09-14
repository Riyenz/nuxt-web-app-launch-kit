import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'

// Neon's serverless driver speaks over WebSocket/HTTP and is what production
// uses. Anything else — a local `prisma dev` PGlite server, a plain Postgres
// (including the CI service container), or a `prisma+postgres://localhost` dev
// URL — goes through the node-postgres adapter, which also knows how to
// transform local `prisma+postgres` URLs.
function isNeonUrl(url: string) {
  return /neon\.tech/i.test(url)
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
  const max = process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 1
  return new PrismaPg({ connectionString, max })
}

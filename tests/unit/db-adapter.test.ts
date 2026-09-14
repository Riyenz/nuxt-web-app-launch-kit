import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDbAdapter } from '../../app/lib/db-adapter'

// `adapterName` is the adapter's own public identifier, so these assertions survive
// the class renames Prisma does between minor versions.
const NEON = '@prisma/adapter-neon'
const POSTGRES = '@prisma/adapter-pg'

const original = { url: process.env.DATABASE_URL, poolMax: process.env.DB_POOL_MAX }

// `config` is how the node-postgres adapter carries its pool options, but it is not
// on the public adapter type. Read it through a narrow cast rather than widening the
// assertion to nothing — the pool size is the whole point of the test below.
function poolMaxOf(adapter: unknown) {
  return (adapter as { config?: { max?: number } }).config?.max
}

function restore(key: 'DATABASE_URL' | 'DB_POOL_MAX', value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key)
  } else {
    process.env[key] = value
  }
}

beforeEach(() => {
  delete process.env.DB_POOL_MAX
})

afterEach(() => {
  restore('DATABASE_URL', original.url)
  restore('DB_POOL_MAX', original.poolMax)
})

describe('createDbAdapter', () => {
  it('uses the Neon serverless driver for a Neon URL', () => {
    const adapter = createDbAdapter('postgresql://user:pass@ep-cool-name.us-east-2.aws.neon.tech/db')

    expect(adapter.adapterName).toBe(NEON)
  })

  it('uses node-postgres for a local PGlite server', () => {
    const adapter = createDbAdapter('postgres://postgres:postgres@localhost:51214/template1?sslmode=disable')

    expect(adapter.adapterName).toBe(POSTGRES)
  })

  it('uses node-postgres for a plain Postgres URL, like the CI service container', () => {
    const adapter = createDbAdapter('postgres://postgres:postgres@localhost:5432/ci')

    expect(adapter.adapterName).toBe(POSTGRES)
  })

  it('falls back to DATABASE_URL when no connection string is passed', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@ep-x.us-east-2.aws.neon.tech/db'

    expect(createDbAdapter().adapterName).toBe(NEON)
  })

  it('refuses to guess when there is no connection string at all', () => {
    delete process.env.DATABASE_URL

    expect(() => createDbAdapter()).toThrow('DATABASE_URL is not set')
  })

  // One connection is the default because `prisma dev` multiplexes every TCP
  // connection onto a single PGlite session; a real pool there corrupts concurrent
  // queries with a 08P01 bind error.
  it('serializes local connections unless DB_POOL_MAX opts out', () => {
    expect(poolMaxOf(createDbAdapter('postgres://postgres:postgres@localhost:51214/template1'))).toBe(1)

    process.env.DB_POOL_MAX = '10'
    expect(poolMaxOf(createDbAdapter('postgres://postgres:postgres@localhost:5432/ci'))).toBe(10)
  })
})

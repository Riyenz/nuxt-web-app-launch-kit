import { PrismaClient } from '../../generated/prisma/client'
import { createDbAdapter } from './db-adapter'

// A preview deployment has no stored DATABASE_URL: its build creates its own Neon branch and
// bakes that connection string into runtimeConfig, which server/plugins/00-database-url.ts
// copies onto process.env when Nitro starts. Nitro plugins run after module evaluation, so the
// client is built on first use rather than on import. Seed scripts and tests import this file
// outside Nuxt, where process.env.DATABASE_URL is already set and the plugin never runs.
let client: PrismaClient | undefined

function getClient() {
  if (!client) {
    client = new PrismaClient({ adapter: createDbAdapter() })
  }

  return client
}

// A Proxy keeps `import { prisma }` call sites unchanged.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getClient()
    const value = Reflect.get(instance, property)

    return typeof value === 'function' ? value.bind(instance) : value
  },
  has(_target, property) {
    return Reflect.has(getClient(), property)
  }
})

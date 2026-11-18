import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { PrismaPg } from '@prisma/adapter-pg'

// Reads one row from every table with one release's Prisma Client, the way that release reads
// them in production, and prints which tables failed. Used by scripts/rehearse-deploy.mjs.
//
// Usage: tsx scripts/rehearse-read.ts <generated client folder> <database url>

type Delegate = { findFirst: () => Promise<unknown> }
type Client = Record<string, Delegate> & { $disconnect: () => Promise<void> }

function findDriverMessage(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== 'object' || depth > 6) {
    return null
  }

  const record = value as Record<string, unknown>
  if (typeof record.originalMessage === 'string') {
    return record.originalMessage
  }

  for (const key of ['cause', 'meta', 'driverAdapterError']) {
    const found = findDriverMessage(record[key], depth + 1)
    if (found) {
      return found
    }
  }

  return null
}

function describe(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const lastLine = message.trim().split('\n').filter(Boolean).at(-1) ?? message
  return findDriverMessage(error) ?? lastLine
}

const [clientDir, url] = process.argv.slice(2)

if (!clientDir || !url) {
  console.error('Usage: tsx scripts/rehearse-read.ts <generated client folder> <database url>')
  process.exit(1)
}

const generated = await import(pathToFileURL(join(clientDir, 'client.ts')).href)
const prisma = new generated.PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) as Client
const failures: Record<string, string> = {}
const models = Object.values(generated.Prisma.ModelName as Record<string, string>)

for (const model of models) {
  try {
    await prisma[model.charAt(0).toLowerCase() + model.slice(1)]!.findFirst()
  } catch (error) {
    failures[model] = describe(error)
  }
}

await prisma.$disconnect()
console.log(JSON.stringify({ count: models.length, failures }))

import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { neon } from '@neondatabase/serverless'

import { listContractMigrations, MIGRATIONS_DIR } from '../migration-phases.mjs'

const MAX_ATTEMPTS = 5
const BASE_DELAY_MS = 2000
const CONNECTION_ERROR_PATTERN = /P1001|P1002|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|Can't reach database server|advisory lock/i

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function wakeDatabase() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.warn('DATABASE_URL not set; skipping wake-up ping')
    return
  }

  // @neondatabase/serverless only speaks to neon.tech; against localhost it
  // fails and burns ~30s of exponential backoff before migrate even starts.
  if (!/neon\.tech/i.test(url)) {
    return
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const sql = neon(url)
      await sql`SELECT 1`
      console.log(`Database wake-up ping succeeded (attempt ${attempt})`)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt === MAX_ATTEMPTS) {
        console.warn(`Wake-up ping failed after ${MAX_ATTEMPTS} attempts; continuing: ${message}`)
        return
      }
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1)
      console.warn(`Wake-up ping attempt ${attempt} failed (${message}); retrying in ${delay}ms`)
      await sleep(delay)
    }
  }
}

async function runMigrateDeploy() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`Running prisma migrate deploy (attempt ${attempt}/${MAX_ATTEMPTS})`)
    const result = spawnSync('prisma', ['migrate', 'deploy'], {
      encoding: 'utf-8',
      env: process.env
    })

    process.stdout.write(result.stdout || '')
    process.stderr.write(result.stderr || '')

    if (result.status === 0) {
      return
    }

    const output = `${result.stdout || ''}\n${result.stderr || ''}`
    const isConnectionError = CONNECTION_ERROR_PATTERN.test(output)

    if (!isConnectionError) {
      process.exit(result.status ?? 1)
    }

    if (attempt === MAX_ATTEMPTS) {
      console.error(`prisma migrate deploy failed after ${MAX_ATTEMPTS} attempts due to connection errors`)
      process.exit(result.status ?? 1)
    }

    const delay = BASE_DELAY_MS * 2 ** (attempt - 1)
    console.warn(`Connection error detected; retrying in ${delay}ms`)
    await sleep(delay)
  }
}

// The deployment serving production lists the contract migrations it was built with
// (server/api/cron/contract-migrations.get.ts). Any answer but a list means none are safe yet.
export async function readLiveContracts(env = process.env, fetchImpl = fetch) {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL
  const productionUrl = host ? `https://${host}` : env.APP_URL
  const secret = env.CRON_SECRET

  if (!productionUrl || !secret) {
    console.warn('No production URL or no CRON_SECRET: every contract migration waits')
    return []
  }

  try {
    const response = await fetchImpl(new URL('/api/cron/contract-migrations', productionUrl), {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10_000)
    })

    if (!response.ok) {
      console.warn(`Production answered ${response.status} for its contract migrations: every contract migration waits`)
      return []
    }

    const body = await response.json()
    return Array.isArray(body?.contracts) ? body.contracts : []
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Could not ask production for its contract migrations (${message}): every contract migration waits`)
    return []
  }
}

export function findWaitingContracts(contracts, liveContracts) {
  const live = new Set(liveContracts)

  return contracts.filter(function isWaiting(name) {
    return !live.has(name)
  })
}

// Prisma applies what it finds in the folder and skips an applied migration it cannot see, so a
// copy without the waiting folders migrates everything else.
export function copyMigrationsWithout(dir, waiting) {
  const waitingFolders = new Set(waiting.map(function toPath(name) {
    return resolve(dir, name)
  }))
  const copy = join(mkdtempSync(join(tmpdir(), 'migrations-')), 'migrations')

  cpSync(dir, copy, {
    recursive: true,
    filter: function isApplied(source) {
      return !waitingFolders.has(resolve(source))
    }
  })

  return copy
}

// A contract migration removes what the previous release reads, so it runs only once the release
// serving production contains it.
async function holdBackContracts() {
  const contracts = listContractMigrations()

  if (contracts.length === 0) {
    return
  }

  const waiting = findWaitingContracts(contracts, await readLiveContracts())

  if (waiting.length === 0) {
    return
  }

  console.log(`Waiting for a later deploy (production does not contain them yet): ${waiting.join(', ')}`)
  process.env.PRISMA_MIGRATIONS_PATH = copyMigrationsWithout(MIGRATIONS_DIR, waiting)
}

async function main() {
  await Promise.all([
    wakeDatabase(),
    process.env.VERCEL_ENV === 'production' ? holdBackContracts() : null
  ])
  await runMigrateDeploy()
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

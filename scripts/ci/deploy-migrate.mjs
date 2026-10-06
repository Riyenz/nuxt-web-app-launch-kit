import { spawnSync } from 'node:child_process'
import { neon } from '@neondatabase/serverless'

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

async function main() {
  await wakeDatabase()
  await runMigrateDeploy()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

#!/usr/bin/env node
// Pre-commit drift guard: warns (non-blocking) when .env has a variable that is
// missing from the committed .env.example, so new secrets don't get left out of
// the shared mirror. Run `pnpm env:sync` to fix. Skips silently when .env is
// absent (e.g. CI / Vercel), since there is nothing local to compare against.
import { existsSync, readFileSync } from 'node:fs'

const ENV = '.env'
const EXAMPLE = '.env.example'
// Keys that belong in only one file: dotenvx bookkeeping, plus machine-local
// values that must never reach the shared mirror. SHADOW_DATABASE_URL points at
// a local PGlite port that changes between runs, so committing it would send
// every other machine to a dead port instead of letting Prisma provision its own
// shadow database.
const IGNORE = new Set([
  'DOTENV_PUBLIC_KEY_EXAMPLE',
  'DOTENV_PRIVATE_KEY_EXAMPLE',
  'SHADOW_DATABASE_URL'
])

if (!existsSync(ENV) || !existsSync(EXAMPLE)) process.exit(0)

function keyNames(path) {
  return new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .map(line => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1])
      .filter(key => key && !IGNORE.has(key))
  )
}

const envKeys = keyNames(ENV)
const exampleKeys = keyNames(EXAMPLE)
const missing = [...envKeys].filter(key => !exampleKeys.has(key))

if (missing.length > 0) {
  console.warn('\n⚠️  .env has variables not in .env.example:')
  for (const key of missing) console.warn(`     - ${key}`)
  console.warn('   Run `pnpm env:sync` and commit .env.example so other machines get them.\n')
}

// Non-blocking: warn only. Change to `process.exit(missing.length ? 1 : 0)` to
// make missing keys block the commit instead.
process.exit(0)

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { spawnSync } from 'node:child_process'
import { connect } from 'node:net'

// Each Paseo worktree gets its own named `prisma dev` server — PGlite, a real
// Postgres compiled to WASM — instead of a Neon branch. It runs detached, so
// nothing has to hold a terminal, and its data lives with the named server
// until teardown removes it.
//
// Ports are deliberately not pinned here — a fixed port would collide with the
// next worktree — so `prisma dev` allocates its own and the connection strings
// are read back out of `prisma dev ls` once the server is up. Ports can change
// across restarts, which is why setup rewrites .env on every run.

function getWorktreeName() {
  const worktreePath = process.env.PASEO_WORKTREE_PATH || process.cwd()
  return basename(resolve(worktreePath))
}

function deriveServerName(worktreeName) {
  const slug = worktreeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'worktree'
  return `pw-${slug}`.slice(0, 63)
}

function runPrismaDev(args, { isCaptured = false } = {}) {
  return spawnSync('pnpm', ['exec', 'prisma', 'dev', ...args], isCaptured
    ? { encoding: 'utf-8' }
    : { stdio: 'inherit' })
}

function listServers() {
  const result = runPrismaDev(['ls'], { isCaptured: true })
  if (result.status !== 0) {
    throw new Error(`\`prisma dev ls\` failed: ${result.stderr || result.stdout}`)
  }
  return result.stdout || ''
}

function findServerStatus(listing, serverName) {
  // The name and status columns are printed without colour codes, so the row
  // can be matched directly instead of stripping the table's ANSI escapes.
  const row = listing.match(new RegExp(`^\\s*${serverName}\\s+(\\S+)`, 'm'))
  return row ? row[1] : null
}

// `prisma dev ls` renders each running server's details as a prisma+postgres
// URL whose api_key is base64url-encoded JSON holding the real TCP database and
// shadow URLs. Decoding it is the only machine-readable way to learn which
// ports the server actually picked.
function findServerUrls(listing, serverName) {
  for (const match of listing.matchAll(/api_key=([A-Za-z0-9_-]+)/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf-8'))
      if (payload.name !== serverName || !payload.databaseUrl) continue
      return {
        databaseUrl: normalizeUrl(payload.databaseUrl),
        shadowDatabaseUrl: payload.shadowDatabaseUrl ? normalizeUrl(payload.shadowDatabaseUrl) : null
      }
    } catch {
      // The table also prints a truncated, undecodable preview of each key.
      continue
    }
  }
  return null
}

// Drop Prisma's pool tuning parameters (connection_limit, pool_timeout, ...).
// They're meaningful to Prisma's own pool, not to the drivers reading this URL.
function normalizeUrl(url) {
  const parsed = new URL(url)
  parsed.search = 'sslmode=disable'
  return parsed.toString()
}

function canConnect(port) {
  return new Promise((resolvePromise) => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.once('connect', () => {
      socket.destroy()
      resolvePromise(true)
    })
    socket.once('error', () => resolvePromise(false))
  })
}

async function waitForServer(serverName) {
  for (let attempt = 1; attempt <= 60; attempt++) {
    const urls = findServerUrls(listServers(), serverName)
    if (urls && await canConnect(Number(new URL(urls.databaseUrl).port))) return urls
    await new Promise(resolvePromise => setTimeout(resolvePromise, 1000))
  }
  throw new Error(`Server "${serverName}" did not accept connections within 60s`)
}

function rewriteEnv(envPath, variables) {
  let content = readFileSync(envPath, 'utf-8')

  for (const [key, value] of Object.entries(variables)) {
    if (new RegExp(`^${key}=.*`, 'm').test(content)) {
      content = content.replace(new RegExp(`^${key}=.*`, 'm'), `${key}=${value}`)
    } else {
      content += `${content.endsWith('\n') ? '' : '\n'}${key}=${value}\n`
    }
  }

  writeFileSync(envPath, content)
}

function runProjectCommand(args, worktreeDir, extraEnv) {
  console.log(`Running: pnpm ${args.join(' ')}`)
  const result = spawnSync('pnpm', args, {
    cwd: worktreeDir,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  })
  if (result.status !== 0) {
    throw new Error(`\`pnpm ${args.join(' ')}\` exited with status ${result.status}`)
  }
}

function readMetadata(worktreeDir) {
  const metadataPath = resolve(worktreeDir, '.context', 'paseo-local-db.json')
  if (!existsSync(metadataPath)) return null
  return JSON.parse(readFileSync(metadataPath, 'utf-8'))
}

function writeMetadata(worktreeDir, metadata) {
  const metadataDir = resolve(worktreeDir, '.context')
  mkdirSync(metadataDir, { recursive: true })
  writeFileSync(resolve(metadataDir, 'paseo-local-db.json'), JSON.stringify(metadata, null, 2))
}

async function setup() {
  const worktreeDir = process.cwd()
  const worktreeName = getWorktreeName()
  const envPath = resolve(worktreeDir, '.env')

  if (!existsSync(envPath)) {
    console.error('ERROR: No .env file found. Run `cp .env.example .env` first.')
    process.exit(1)
  }

  const serverName = deriveServerName(worktreeName)
  console.log(`Worktree: ${worktreeName}`)
  console.log(`Local Postgres server: ${serverName}`)

  const metadata = readMetadata(worktreeDir)
  const status = findServerStatus(listServers(), serverName)
  // A server missing from `prisma dev ls` has no data — teardown removes the
  // server and its storage together — so it needs migrations and a seed even
  // when stale metadata survived.
  const isFresh = status === null

  if (isFresh) {
    console.log('Creating PGlite server...')
    if (runPrismaDev(['--detach', '--name', serverName]).status !== 0) {
      throw new Error('`prisma dev --detach` failed')
    }
  } else if (status === 'running') {
    console.log('PGlite server already running.')
  } else {
    console.log('Starting existing PGlite server...')
    if (runPrismaDev(['start', serverName]).status !== 0) {
      throw new Error('`prisma dev start` failed')
    }
  }

  console.log('Waiting for Postgres to accept connections...')
  const { databaseUrl, shadowDatabaseUrl } = await waitForServer(serverName)

  const variables = {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    ...(shadowDatabaseUrl ? { SHADOW_DATABASE_URL: shadowDatabaseUrl } : {})
  }
  rewriteEnv(envPath, variables)
  console.log(`Pointed .env at ${databaseUrl}`)

  runProjectCommand(['exec', 'prisma', 'migrate', 'deploy'], worktreeDir, variables)
  if (isFresh || !metadata?.isSeeded) {
    runProjectCommand(['run', 'seed'], worktreeDir, variables)
  } else {
    console.log('Database already seeded; skipping seed.')
  }

  writeMetadata(worktreeDir, {
    serverName,
    databaseUrl,
    isSeeded: true,
    worktreeName,
    paseoBranchName: process.env.PASEO_BRANCH_NAME || null,
    createdAt: metadata?.createdAt || new Date().toISOString()
  })
  console.log('Local PGlite Postgres ready.')
}

async function teardown() {
  const worktreeDir = process.cwd()
  const metadata = readMetadata(worktreeDir)
  const serverName = metadata?.serverName || deriveServerName(getWorktreeName())

  console.log(`Removing local PGlite server ${serverName}...`)
  if (runPrismaDev(['rm', '--force', serverName]).status !== 0) {
    // Never block worktree removal on database cleanup.
    console.warn(`WARN: could not remove the PGlite server. Run \`pnpm exec prisma dev rm --force ${serverName}\` manually.`)
  }

  rmSync(resolve(worktreeDir, '.context', 'paseo-local-db.json'), { force: true })
  console.log('Teardown complete.')
}

const command = process.argv[2]
if (command === 'setup') {
  setup().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
} else if (command === 'teardown') {
  teardown().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
} else {
  console.error('Usage: node local-db.mjs <setup|teardown>')
  process.exit(1)
}

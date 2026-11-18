import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { hasRef, isContractMigration, listContractMigrations, listNewMigrations, MIGRATIONS_DIR, readSchemaAt } from './migration-phases.mjs'

// A mock production deploy on a throwaway Postgres in Docker. Release A is the base ref (what
// production runs), release B is this working tree. Each release reads every table with its own
// Prisma Client at every step of two deploys, the way it does while Vercel migrates, and the same
// migrations are then run the old way (all at once) for comparison. See docs/prisma-workflow.md.
//
// Usage: pnpm db:rehearse [base-ref]      (default origin/master; needs Docker)

const baseRef = process.argv[2] ?? 'origin/master'
const workDir = resolve('.cache/rehearse')
const container = `rehearse-deploy-${process.pid}`
const port = 55000 + Math.floor(Math.random() * 1000)
const password = 'rehearse'
const secret = 'rehearse'
let isFailed = false

function urlFor(database) {
  return `postgresql://postgres:${password}@localhost:${port}/${database}`
}

function databaseEnv(database) {
  // prisma.config.ts loads .env, which must not point a rehearsal at a real database.
  return { DATABASE_URL: urlFor(database), DIRECT_URL: urlFor(database), SHADOW_DATABASE_URL: '' }
}

/// Asynchronous on purpose: the mock live app answers from this process while a deploy runs.
function run(command, args, env = {}) {
  return new Promise(function execute(resolveRun) {
    const child = spawn(command, args, { env: { ...process.env, ...env } })
    const chunks = []
    child.stdout.on('data', function collect(chunk) {
      chunks.push(chunk)
    })
    child.stderr.on('data', function collect(chunk) {
      chunks.push(chunk)
    })
    child.on('error', function fail(error) {
      resolveRun({ isOk: false, output: error.message })
    })
    child.on('close', function finish(code) {
      resolveRun({ isOk: code === 0, output: Buffer.concat(chunks).toString() })
    })
  })
}

async function mustRun(command, args, env = {}) {
  const result = await run(command, args, env)
  if (!result.isOk) {
    console.error(`✗ ${command} ${args.join(' ')} failed:\n${result.output.trim().split('\n').slice(-15).join('\n')}`)
    throw new Error('rehearsal stopped')
  }
  return result.output
}

async function prepareRelease(name, schemaText) {
  const dir = join(workDir, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'schema.prisma'), schemaText.replace(/output\s*=\s*"[^"]*"/, 'output = "./client"'))
  await mustRun('prisma', ['generate', '--schema', join(dir, 'schema.prisma')])
  await mustRun('sh', ['-c', `git archive ${baseRef} ${MIGRATIONS_DIR} | tar -x -C "${dir}"`])
  return dir
}

async function readAll(release, database) {
  const output = await mustRun('tsx', ['scripts/rehearse-read.ts', release.client, urlFor(database)])
  return JSON.parse(output.trim().split('\n').at(-1))
}

async function report(release, database, isExpectedToPass = true) {
  const { count, failures } = await readAll(release, database)
  const failed = Object.entries(failures)
  const label = `${release.name} reads ${count} tables`

  console.log(`        ${label.padEnd(34, '.')} ${failed.length === 0 ? 'ok' : `${failed.length} failed`}`)
  for (const [model, message] of failed) {
    console.log(`          ${model}: ${message}`)
  }

  if (failed.length > 0 && isExpectedToPass) {
    isFailed = true
  }
}

async function readApplied(database) {
  const output = await mustRun('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', database, '-tAc',
    'select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null'])
  return new Set(output.split('\n').map(function trim(line) {
    return line.trim()
  }).filter(Boolean))
}

function startLiveApp(contracts) {
  const server = createServer(function answer(request, response) {
    if (request.headers.authorization !== `Bearer ${secret}`) {
      response.writeHead(401).end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ contracts }))
  })

  return new Promise(function listen(resolveServer) {
    server.listen(0, '127.0.0.1', function ready() {
      resolveServer(server)
    })
  })
}

/// Runs the real production deploy step, then says which of B's new migrations ran. `expected`
/// names the ones that must have run by now; every other new one must still wait.
async function deploy(database, liveContracts, newMigrations, expected) {
  const before = await readApplied(database)
  const server = await startLiveApp(liveContracts)

  try {
    await mustRun('node', ['scripts/ci/deploy-migrate.mjs'], {
      ...databaseEnv(database),
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: '',
      APP_URL: `http://127.0.0.1:${server.address().port}`,
      CRON_SECRET: secret
    })
  } finally {
    server.close()
  }

  const applied = await readApplied(database)
  for (const name of newMigrations) {
    const isApplied = applied.has(name)
    const kind = isContractMigration(name) ? 'contract' : 'expand  '

    if (isApplied && !before.has(name)) {
      console.log(`        applied ${kind}  ${name}`)
    } else if (!isApplied) {
      console.log(`        waiting ${kind}  ${name}`)
    }
    if (isApplied !== expected.has(name)) {
      console.log(`        ! ${name} should ${expected.has(name) ? 'have run' : 'still wait'}`)
      isFailed = true
    }
  }
}

async function main() {
  if (!(await run('docker', ['info'])).isOk) {
    console.error('✗ Docker is not running. Start Docker Desktop, then run pnpm db:rehearse again.')
    process.exit(1)
  }
  if (!hasRef(baseRef)) {
    console.error(`✗ ${baseRef} not found. Run: git fetch origin master`)
    process.exit(1)
  }

  const newMigrations = listNewMigrations(baseRef).map(function toName(migration) {
    return migration.name
  })
  const expandMigrations = new Set(newMigrations.filter(function isExpand(name) {
    return !isContractMigration(name)
  }))
  const baseSha = (await mustRun('git', ['rev-parse', '--short', baseRef])).trim()

  rmSync(workDir, { recursive: true, force: true })
  console.log(`Rehearsal: release A = ${baseRef} (${baseSha}), release B = this working tree`)
  console.log(`New migrations in B: ${newMigrations.length === 0 ? 'none' : newMigrations.join(', ')}\n`)

  await mustRun('docker', ['run', '-d', '--rm', '--name', container, '-e', `POSTGRES_PASSWORD=${password}`, '-p', `127.0.0.1:${port}:5432`, 'postgres:17'])

  // Both clients build while Postgres starts. B reads with the working tree's own client.
  const [aDir] = await Promise.all([
    prepareRelease('a', readSchemaAt(baseRef)),
    mustRun('prisma', ['generate'])
  ])
  const a = { name: 'A (old app)', client: join(aDir, 'client') }
  const b = { name: 'B (new app)', client: resolve('generated/prisma') }
  const aMigrations = join(aDir, MIGRATIONS_DIR)

  for (let attempt = 0; attempt < 60 && !(await run('docker', ['exec', container, 'pg_isready', '-U', 'postgres', '-h', 'localhost'])).isOk; attempt += 1) {
    await sleep(1000)
  }
  await mustRun('docker', ['exec', container, 'psql', '-U', 'postgres', '-qc', 'create database expand_contract'])
  await mustRun('prisma', ['migrate', 'deploy'], { ...databaseEnv('expand_contract'), PRISMA_MIGRATIONS_PATH: aMigrations })
  await mustRun('docker', ['exec', container, 'psql', '-U', 'postgres', '-qc', 'create database old_way template expand_contract'])

  console.log('Step 1  production runs A')
  await report(a, 'expand_contract')

  console.log('Step 2  deploy B: A is still live while the build migrates')
  await deploy('expand_contract', listContractMigrations(aMigrations), newMigrations, expandMigrations)
  await report(a, 'expand_contract')
  await report(b, 'expand_contract')
  console.log('        B goes live')

  console.log('Step 3  next deploy: B is live while the build migrates')
  await deploy('expand_contract', listContractMigrations(), newMigrations, new Set(newMigrations))
  await report(b, 'expand_contract')

  console.log('\nOld way: one deploy applies every migration while A is still live')
  await mustRun('prisma', ['migrate', 'deploy'], databaseEnv('old_way'))
  await report(a, 'old_way', false)

  console.log(isFailed
    ? '\n✗ A live app fails during this rehearsal. Fix the migrations above before you release.'
    : '\n✓ No step breaks a live app.')
}

main()
  .catch(function stop(error) {
    if (error.message !== 'rehearsal stopped') {
      console.error(error)
    }
    isFailed = true
  })
  .finally(async function cleanUp() {
    await run('docker', ['stop', container])
    rmSync(workDir, { recursive: true, force: true })
    process.exit(isFailed ? 1 : 0)
  })

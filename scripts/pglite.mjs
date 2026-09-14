#!/usr/bin/env node
// Local, Docker-free Postgres for development, backed by Prisma 7's bundled
// PGlite server (`prisma dev`). PGlite is a real Postgres compiled to WASM, so
// enums, JSON, Decimal, triggers and advisory locks all behave like Neon.
//
//   node scripts/pglite.mjs server          # start the local DB (keep running)
//   node scripts/pglite.mjs exec -- <cmd>   # run <cmd> pointed at the local DB
//   node scripts/pglite.mjs url             # print the local connection string
//
// `exec` injects DATABASE_URL / DIRECT_URL / SHADOW_DATABASE_URL so Prisma and
// Nuxt talk to PGlite instead of Neon, without touching the committed .env.
//
// Paseo worktrees don't use this script — they each get their own detached
// server on ports Prisma picks; see .paseo/local-db.mjs.
import { spawn } from 'node:child_process'

// `prisma dev` refuses to start on a port another Prisma Dev server already owns, and
// 51213-51215 is its documented default range — so a second project on this machine
// collides with the first. These defaults sit clear of it; override with the env vars
// if you run several checkouts of THIS project at once.
const NAME = process.env.PGLITE_NAME ?? 'launch-kit'
const PORT = process.env.PGLITE_PORT ?? '51313'
const DB_PORT = process.env.PGLITE_DB_PORT ?? '51314'
const SHADOW_DB_PORT = process.env.PGLITE_SHADOW_DB_PORT ?? '51315'

function localUrl(port) {
  return `postgres://postgres:postgres@localhost:${port}/template1?sslmode=disable`
}

const DATABASE_URL = localUrl(DB_PORT)
const SHADOW_DATABASE_URL = localUrl(SHADOW_DB_PORT)

function run(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  })
  child.on('exit', code => process.exit(code ?? 0))
  child.on('error', (error) => {
    console.error(error.message)
    process.exit(1)
  })
}

const [subcommand, ...rest] = process.argv.slice(2)

switch (subcommand) {
  case 'server':
    run('prisma', [
      'dev',
      '--name', NAME,
      '--port', PORT,
      '--db-port', DB_PORT,
      '--shadow-db-port', SHADOW_DB_PORT
    ])
    break

  case 'exec': {
    const args = rest[0] === '--' ? rest.slice(1) : rest
    if (args.length === 0) {
      console.error('Usage: node scripts/pglite.mjs exec -- <command>')
      process.exit(1)
    }
    run(args[0], args.slice(1), {
      DATABASE_URL,
      DIRECT_URL: DATABASE_URL,
      SHADOW_DATABASE_URL
    })
    break
  }

  case 'url':
    console.log(DATABASE_URL)
    break

  default:
    console.error('Usage: node scripts/pglite.mjs <server|exec|url>')
    process.exit(1)
}

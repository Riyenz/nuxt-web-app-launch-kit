#!/usr/bin/env node
// Re-encrypt .env.example from the local .env, REUSING the existing keypair
// (never rotates — to rotate use `pnpm exec dotenvx rotate -f .env.example`).
// Run after adding / changing / removing a variable in .env, then commit
// .env.example. See CLAUDE.md -> "Environment & Worktrees".
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const ENV = '.env'
const EXAMPLE = '.env.example'
const PUB_KEY = 'DOTENV_PUBLIC_KEY_EXAMPLE'

if (!existsSync(ENV)) {
  console.error(`❌ ${ENV} not found — run \`pnpm setup:env\` first.`)
  process.exit(1)
}
if (!existsSync(EXAMPLE)) {
  console.error(`❌ ${EXAMPLE} not found — nothing to sync against.`)
  process.exit(1)
}

// The public key in .env.example is what dotenvx uses to encrypt. We must keep
// it so the existing private key (in .env.keys / ~/.zshrc) still decrypts.
function publicKeyLine(contents) {
  return contents.split('\n').find(line => line.startsWith(`${PUB_KEY}=`))
}

const envContents = readFileSync(ENV, 'utf8')
const examplePub = publicKeyLine(readFileSync(EXAMPLE, 'utf8'))

if (!examplePub) {
  console.error(
    `❌ ${EXAMPLE} has no ${PUB_KEY} header — refusing to sync (would mint a new keypair).`
  )
  process.exit(1)
}

// Rebuild .env.example as: existing public key header + the plaintext .env body
// (dropping any public-key line .env carried over from `setup:env`). dotenvx
// then encrypts every plaintext value under that same public key.
const body = envContents
  .split('\n')
  .filter(line => !line.startsWith(`${PUB_KEY}=`))
  .join('\n')

writeFileSync(EXAMPLE, `${examplePub}\n${body.startsWith('\n') ? body.slice(1) : body}`)
execFileSync('pnpm', ['exec', 'dotenvx', 'encrypt', '-f', EXAMPLE], { stdio: 'inherit' })

console.log('✅ .env.example re-encrypted from .env (keypair unchanged). Commit .env.example.')

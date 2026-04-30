#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function printStatus(color, symbol, label, hint) {
  console.log(`  ${color}${symbol}${RESET} ${label}${hint ? `\n    → ${hint}` : ''}`)
}

function pass(label) {
  printStatus(GREEN, '✓', label)
}

function fail(label, hint) {
  printStatus(RED, '✗', label, hint)
}

function warn(label, hint) {
  printStatus(YELLOW, '~', label, hint)
}

function clerkEnv(key) {
  return key.includes('_live_') ? 'production' : 'development'
}

function loadEnv(filePath) {
  const env = {}
  if (!existsSync(filePath)) return env
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    let value = trimmed.slice(idx + 1)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

async function checkNeonApi(projectId, apiKey) {
  const res = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  return res.ok
}

async function main() {
  console.log(`\n${BOLD}Project health check${RESET}\n`)

  const envPath = resolve(process.cwd(), '.env')
  let isHealthy = true

  if (!existsSync(envPath)) {
    fail('.env file not found', 'Run: cp .env.example .env')
    console.log(`\n${RED}Create .env first, then re-run make doctor.${RESET}\n`)
    process.exit(1)
  }
  pass('.env file exists')

  const env = { ...loadEnv(envPath), ...process.env }

  console.log(`\n${BOLD}Required (local dev)${RESET}`)

  const requiredChecks = [
    {
      key: 'DATABASE_URL',
      hint: 'Get from console.neon.tech → Project → Connection Details',
      validate: v => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      validationHint: 'Must start with postgresql://',
      label: () => 'DATABASE_URL'
    },
    {
      key: 'NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      hint: 'Get from dashboard.clerk.com → API Keys',
      validate: v => v.startsWith('pk_'),
      validationHint: 'Must start with pk_',
      label: v => `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY (${clerkEnv(v)})`
    },
    {
      key: 'NUXT_CLERK_SECRET_KEY',
      hint: 'Get from dashboard.clerk.com → API Keys',
      validate: v => v.startsWith('sk_'),
      validationHint: 'Must start with sk_',
      label: v => `NUXT_CLERK_SECRET_KEY (${clerkEnv(v)})`
    }
  ]

  for (const { key, hint, validate, validationHint, label } of requiredChecks) {
    const value = env[key]
    if (!value) {
      fail(`${key} not set`, hint)
      isHealthy = false
    } else if (!validate(value)) {
      fail(`${key} invalid format`, validationHint)
      isHealthy = false
    } else {
      pass(label(value))
    }
  }

  console.log(`\n${BOLD}Optional (Conductor workspace isolation + CI/CD)${RESET}`)

  const neonProjectId = env.NEON_PROJECT_ID
  const neonApiKey = env.NEON_API_KEY
  const neonParentBranch = env.NEON_PARENT_BRANCH || 'development'

  if (!neonProjectId || !neonApiKey) {
    warn(
      'Neon branching not configured',
      'Set NEON_PROJECT_ID and NEON_API_KEY to enable Conductor workspace isolation and PR preview databases'
    )
  } else {
    pass(`NEON_PROJECT_ID (${neonProjectId})`)
    pass('NEON_API_KEY')
    pass(`NEON_PARENT_BRANCH (${neonParentBranch})`)

    process.stdout.write(`  Checking Neon API connectivity...`)
    const isNeonReachable = await checkNeonApi(neonProjectId, neonApiKey).catch(() => false)
    if (isNeonReachable) {
      console.log(` ${GREEN}✓${RESET}`)
    } else {
      console.log(` ${RED}✗${RESET}`)
      warn('Neon API unreachable or invalid credentials', 'Verify NEON_PROJECT_ID and NEON_API_KEY at console.neon.tech')
    }
  }

  const vercelVars = ['VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'VERCEL_TOKEN']
  const vercelSet = vercelVars.filter(v => env[v])
  if (vercelSet.length === 0) {
    warn(
      'Vercel not configured',
      'Add VERCEL_ORG_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN as GitHub Actions secrets for PR preview deployments'
    )
  } else if (vercelSet.length < vercelVars.length) {
    const missing = vercelVars.filter(v => !env[v])
    warn(`Vercel partially configured — missing: ${missing.join(', ')}`, 'All 3 vars needed for PR preview deployments')
  } else {
    pass('Vercel configured (VERCEL_ORG_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN)')
  }

  console.log('')
  if (!isHealthy) {
    console.log(`${RED}Some checks failed. Fix the issues above and re-run make doctor.${RESET}\n`)
    process.exit(1)
  } else {
    console.log(`${GREEN}All required checks passed. Run make dev to start.${RESET}\n`)
  }
}

main()

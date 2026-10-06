#!/usr/bin/env node
// Fast inner-loop check: cached lint over the repo, plus a type check limited to the
// TypeScript projects the working-tree changes belong to. Falls back to every project
// when a change can alter generated types. Run `pnpm run lint && pnpm run typecheck`
// before you commit.
//
// Usage: node scripts/check.mjs
//
// `test` is this repo's own project, not one Nuxt generates: `pnpm run typecheck`
// covers tests/ through tsconfig.test.json, so the fast path has to as well.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const NUXT_PROJECTS = ['app', 'server', 'shared', 'node']
const PROJECTS = [...NUXT_PROJECTS, 'test']

function run(command, args) {
  return new Promise(function executor(resolve) {
    const chunks = []
    const child = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'] })

    child.stdout.on('data', function collectStdout(chunk) {
      chunks.push(chunk)
    })

    child.stderr.on('data', function collectStderr(chunk) {
      chunks.push(chunk)
    })
    child.on('error', function onError(error) {
      resolve({ code: 1, output: `failed to start ${command}: ${error.message}\n` })
    })
    child.on('close', function onClose(code) {
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString() })
    })
  })
}

function readChanges() {
  return new Promise(function executor(resolve) {
    const child = spawn('git', ['status', '--porcelain'], { stdio: ['inherit', 'pipe', 'inherit'] })
    const chunks = []

    child.stdout.on('data', function collect(chunk) {
      chunks.push(chunk)
    })
    child.on('close', function onClose() {
      const lines = Buffer.concat(chunks).toString().split('\n').filter(Boolean)
      resolve(lines.map(function parse(line) {
        const status = line.slice(0, 2)
        const path = line.slice(3).split(' -> ').pop()
        return { status, path, isStructural: /[ADR?]/.test(status) }
      }))
    })
  })
}

function projectsFor(path) {
  if (path.startsWith('app/')) {
    return ['app']
  }

  if (path.startsWith('server/') || path.startsWith('modules/')) {
    return ['server']
  }

  if (path.startsWith('shared/')) {
    return ['app', 'server', 'shared']
  }

  if (path.startsWith('tests/')) {
    return ['test']
  }

  if (path.startsWith('prisma/') || path.startsWith('scripts/') || path.startsWith('layers/')) {
    return PROJECTS
  }

  if (path.endsWith('.config.ts') || path.endsWith('.config.mjs') || path.endsWith('.d.ts')) {
    return PROJECTS
  }

  return []
}

function needsPrepare(changes) {
  return changes.some(function isTypeShaping(change) {
    if (change.isStructural && /^(app|server|shared|modules|layers)\//.test(change.path)) {
      return true
    }

    return /^(nuxt|vitest|playwright)\.config\.ts$/.test(change.path) || change.path === 'prisma/schema.prisma'
  })
}

function typecheck(project) {
  if (project === 'test') {
    return run('node', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.test.json'])
  }

  return run('node', ['node_modules/vue-tsc/bin/vue-tsc.js', '-p', `.nuxt/tsconfig.${project}.json`, '--noEmit'])
}

const started = Date.now()
const changes = await readChanges()
const selected = PROJECTS.filter(function isSelected(project) {
  return changes.some(function matches(change) {
    return projectsFor(change.path).includes(project)
  })
})

const lint = run('node', ['scripts/quiet.mjs', 'lint', 'eslint', '.', '--cache', '--cache-location', 'node_modules/.cache/eslint'])

if (selected.length === 0) {
  const result = await lint
  process.stdout.write(result.output)
  process.exit(result.code)
}

if (needsPrepare(changes) || !existsSync('.nuxt/tsconfig.app.json')) {
  const prepared = await run('node', ['node_modules/nuxt/bin/nuxt.mjs', 'prepare'])

  if (prepared.code !== 0) {
    process.stdout.write(`✗ prepare failed — output below:\n${prepared.output}`)
    process.exit(prepared.code)
  }
}

const checks = await Promise.all(selected.map(function check(project) {
  return typecheck(project).then(function label(result) {
    return { project, ...result }
  })
}))

const lintResult = await lint
const failed = checks.filter(function isFailed(check) {
  return check.code !== 0
})
const seconds = ((Date.now() - started) / 1000).toFixed(1)

if (lintResult.code === 0 && failed.length === 0) {
  process.stdout.write(`✓ check passed — lint + typecheck [${selected.join(', ')}] (${seconds}s)\n`)
  process.exit(0)
}

if (lintResult.code !== 0) {
  process.stdout.write(lintResult.output)
}

failed.forEach(function report(check) {
  process.stdout.write(`✗ typecheck failed (${check.project}) — output below:\n${check.output}`)
})

process.exit(1)

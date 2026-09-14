#!/usr/bin/env node
// Run a command, buffering its output. On success, print a single summary
// line. On failure, replay everything so nothing is lost. Keeps agent/CI
// context clean when checks pass, which is the common case.
//
// Usage: node scripts/quiet.mjs <label> <command> [args...]

import { spawn } from 'node:child_process'

const [, , label, command, ...args] = process.argv

if (!command) {
  console.error('quiet.mjs: missing command (usage: quiet.mjs <label> <command> [args...])')
  process.exit(1)
}

const chunks = []
const started = Date.now()

const child = spawn(command, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false
})

child.stdout.on('data', function collectStdout(chunk) {
  chunks.push(chunk)
})

child.stderr.on('data', function collectStderr(chunk) {
  chunks.push(chunk)
})

child.on('error', function onError(error) {
  process.stderr.write(`${label}: failed to start — ${error.message}\n`)
  process.exit(1)
})

child.on('close', function onClose(code) {
  const seconds = ((Date.now() - started) / 1000).toFixed(1)

  if (code === 0) {
    process.stdout.write(`✓ ${label} passed (${seconds}s)\n`)
    process.exit(0)
  }

  process.stdout.write(`✗ ${label} failed (exit ${code}, ${seconds}s) — output below:\n`)
  process.stdout.write(Buffer.concat(chunks))
  process.exit(code)
})

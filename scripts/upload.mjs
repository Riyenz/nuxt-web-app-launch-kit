#!/usr/bin/env node
// Upload local files to the "launchkit-review" Vercel Blob store and print public
// URLs. Blob serves everything inline with byte-range support, so the links
// preview straight from a phone browser — videos stream and scrub, PDFs and
// images render — without downloading first. Handy when the person reviewing a
// generated file is on a phone and cannot open a local path.
//
// Every run first deletes files older than MAX_AGE_DAYS: Blob has no expiry, and a
// Hobby store's 1 GB cap fills up quickly with review videos.
//
// Usage: pnpm upload <file> [more files ...]
//        pnpm upload --prune    (only delete the old files)
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { del, list } from '@vercel/blob'

const BLOB_URL = /https:\/\/\S+\.public\.blob\.vercel-storage\.com\/\S+/
const MAX_AGE_DAYS = 7
const DELETE_BATCH_SIZE = 100

function readToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN
  }
  // Read just this one key so a malformed unrelated var can't break uploads.
  try {
    const line = readFileSync('.env', 'utf8')
      .split('\n')
      .find(entry => entry.startsWith('BLOB_READ_WRITE_TOKEN='))
    if (line) {
      return line.slice('BLOB_READ_WRITE_TOKEN='.length).trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    // fall through to the null return below
  }
  return null
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(unit > 0 && size < 10 ? 1 : 0)} ${units[unit]}`
}

function uploadFile(file, token) {
  if (!existsSync(file)) {
    console.error(`  ✗ not found: ${file}`)
    return null
  }
  process.stdout.write(`  ↑ ${basename(file)} (${formatSize(statSync(file).size)}) … `)
  const result = spawnSync(
    'vercel',
    ['blob', 'put', file, '--access', 'public', '--add-random-suffix', 'true', '--rw-token', token],
    { encoding: 'utf8' }
  )
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const url = output.match(BLOB_URL)?.[0]
  if (result.status !== 0 || !url) {
    console.log('failed')
    console.error(output.trim())
    return null
  }
  console.log('done')
  return url
}

async function listAllBlobs(token) {
  const blobs = []
  let cursor
  do {
    const page = await list({ token, cursor, limit: 1000 })
    blobs.push(...page.blobs)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return blobs
}

async function deleteExpiredBlobs(token) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  const expired = (await listAllBlobs(token))
    .filter(blob => new Date(blob.uploadedAt).getTime() < cutoff)
  if (expired.length === 0) {
    return
  }
  for (let start = 0; start < expired.length; start += DELETE_BATCH_SIZE) {
    const batch = expired.slice(start, start + DELETE_BATCH_SIZE)
    await del(batch.map(blob => blob.url), { token })
  }
  const freed = expired.reduce((total, blob) => total + blob.size, 0)
  console.log(`  🗑 deleted ${expired.length} files older than ${MAX_AGE_DAYS} days (${formatSize(freed)})`)
}

const isPruneOnly = process.argv.includes('--prune')
const files = process.argv.slice(2).filter(arg => arg !== '--prune')
if (files.length === 0 && !isPruneOnly) {
  console.error('Usage: pnpm upload <file> [more files ...]')
  console.error('       pnpm upload --prune')
  process.exit(1)
}

const token = readToken()
if (!token) {
  console.error('❌ BLOB_READ_WRITE_TOKEN is not set. Run `pnpm setup:env` to decode .env.')
  process.exit(1)
}

try {
  await deleteExpiredBlobs(token)
} catch (error) {
  // A failed cleanup must never block the upload itself.
  console.error(`  ⚠ could not delete old files: ${error.message}`)
}

if (isPruneOnly) {
  process.exit(0)
}

const urls = []
for (const file of files) {
  const url = uploadFile(file, token)
  if (url) {
    urls.push(url)
  }
}

if (urls.length > 0) {
  console.log('\nOpen on your phone:')
  for (const url of urls) {
    console.log(`  ${url}`)
  }
}

process.exit(urls.length === files.length ? 0 : 1)

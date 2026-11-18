import type { H3Event } from 'h3'
import { createError, setResponseHeader } from 'h3'
import { prisma } from '~/lib/prisma'
import type { Prisma } from '~~/generated/prisma/client'

// Failures live in Postgres, not in process memory. A serverless platform runs many
// instances and restarts them cold, so an in-memory counter resets per instance and an
// attacker who spreads guesses across instances never hits the limit.

export type RateLimitConfig = {
  maxFailures: number
  windowMs: number
}

// One row per kind of attempt. Add a scope here before calling the limiter for it.
export const rateLimitScopes = {
  'verification-code': { maxFailures: 5, windowMs: 15 * 60 * 1000 }
} as const satisfies Record<string, RateLimitConfig>

export type RateLimitScope = keyof typeof rateLimitScopes

// `key` names who or what is being limited inside the scope: a user ID, an email, an IP.
export type RateLimitTarget = {
  scope: RateLimitScope
  key: string
}

export type RateLimitState = {
  failureCount: number
  isRateLimited: boolean
  remainingAttempts: number
  retryAfterSeconds: number
}

// The singleton or a transaction client, so a caller that holds a lock can keep the
// read-check-write inside its own transaction.
export type RateLimitClient = Pick<Prisma.TransactionClient, 'rateLimitFailure'>

export function rateLimitKey(target: RateLimitTarget) {
  return `${target.scope}:${target.key}`
}

export function deriveRateLimitState(failedAtMs: number[], now: number, config: RateLimitConfig): RateLimitState {
  const windowStart = now - config.windowMs
  const inWindow = failedAtMs.filter(function isInWindow(timestamp) {
    return timestamp > windowStart
  })
  const failureCount = inWindow.length
  const isRateLimited = failureCount >= config.maxFailures
  const oldestFailure = failureCount > 0 ? Math.min(...inWindow) : undefined

  return {
    failureCount,
    isRateLimited,
    remainingAttempts: Math.max(0, config.maxFailures - failureCount),
    retryAfterSeconds: oldestFailure === undefined
      ? 0
      : Math.max(1, Math.ceil((oldestFailure + config.windowMs - now) / 1000))
  }
}

export async function getRateLimitState(
  target: RateLimitTarget,
  now = Date.now(),
  client: RateLimitClient = prisma
) {
  const config = rateLimitScopes[target.scope]
  const rows = await client.rateLimitFailure.findMany({
    where: { key: rateLimitKey(target), failedAt: { gt: new Date(now - config.windowMs) } },
    select: { failedAt: true }
  })
  const failedAtMs = rows.map(function toMillis(row) {
    return row.failedAt.getTime()
  })

  return deriveRateLimitState(failedAtMs, now, config)
}

export async function assertNotRateLimited(
  event: H3Event,
  target: RateLimitTarget,
  now = Date.now(),
  client: RateLimitClient = prisma
) {
  const state = await getRateLimitState(target, now, client)

  if (state.isRateLimited) {
    setResponseHeader(event, 'Retry-After', state.retryAfterSeconds)
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  return state
}

export async function recordRateLimitFailure(
  target: RateLimitTarget,
  now = Date.now(),
  client: RateLimitClient = prisma
) {
  const key = rateLimitKey(target)
  const { windowMs } = rateLimitScopes[target.scope]

  // Expired rows are pruned on write, so one key never holds more than a window of rows.
  await client.rateLimitFailure.deleteMany({
    where: { key, failedAt: { lte: new Date(now - windowMs) } }
  })
  await client.rateLimitFailure.create({
    data: { key, failedAt: new Date(now) }
  })
}

export async function resetRateLimit(target: RateLimitTarget, client: RateLimitClient = prisma) {
  await client.rateLimitFailure.deleteMany({ where: { key: rateLimitKey(target) } })
}

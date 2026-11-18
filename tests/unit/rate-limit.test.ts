import { describe, expect, it } from 'vitest'
import { deriveRateLimitState, rateLimitKey } from '../../server/utils/rate-limit'

const MINUTE = 60 * 1000
const config = { maxFailures: 3, windowMs: 10 * MINUTE }
const now = Date.UTC(2026, 0, 1, 12, 0, 0)

describe('deriveRateLimitState', () => {
  it('allows every attempt when nothing has failed', () => {
    expect(deriveRateLimitState([], now, config)).toEqual({
      failureCount: 0,
      isRateLimited: false,
      remainingAttempts: 3,
      retryAfterSeconds: 0
    })
  })

  it('counts only failures inside the window', () => {
    const failures = [now - 11 * MINUTE, now - 10 * MINUTE, now - 5 * MINUTE]
    const state = deriveRateLimitState(failures, now, config)

    expect(state.failureCount).toBe(1)
    expect(state.remainingAttempts).toBe(2)
    expect(state.isRateLimited).toBe(false)
  })

  it('locks out at the limit until the oldest failure in the window expires', () => {
    const failures = [now - 8 * MINUTE, now - 2 * MINUTE, now - 1 * MINUTE]
    const state = deriveRateLimitState(failures, now, config)

    expect(state.isRateLimited).toBe(true)
    expect(state.remainingAttempts).toBe(0)
    expect(state.retryAfterSeconds).toBe(2 * 60)
  })

  it('reports at least one second to wait while a failure is in the window', () => {
    const failures = [now - config.windowMs + 1]

    expect(deriveRateLimitState(failures, now, config).retryAfterSeconds).toBe(1)
  })

  it('lifts the lockout once the window passes', () => {
    const failures = [now - 8 * MINUTE, now - 2 * MINUTE, now - 1 * MINUTE]
    const later = now + 3 * MINUTE

    expect(deriveRateLimitState(failures, later, config).isRateLimited).toBe(false)
  })
})

describe('rateLimitKey', () => {
  it('keeps the same key apart across scopes', () => {
    expect(rateLimitKey({ scope: 'verification-code', key: 'user_1' })).toBe('verification-code:user_1')
  })
})

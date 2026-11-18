import type { PostHog } from 'posthog-node'
import { readFeatureFlagOverrides, resolveFeatureFlag, type FeatureFlagKey } from '~~/shared/feature-flags'
import { getPosthogClient, resolveRuntimeConfig } from './posthog'

// A cold check waits at most this long. Past it the person gets the default, and the answer
// still lands in the cache for their next request.
const EVALUATION_TIMEOUT_MS = 250
// After this an answer is refreshed in the background while the old one keeps being served, so
// turning a flag off in PostHog reaches the server within about a minute.
const FRESH_FOR_MS = 60_000
// Past this an answer is too old to serve, and the next check waits again.
const KEEP_FOR_MS = 10 * 60_000
const MAX_CACHED_ANSWERS = 5000

export interface FeatureFlagSubject {
  // The Clerk user id: the same distinct id the browser identifies with.
  userId: string
  email?: string | null
}

/** Asks the flag service. `undefined` means no answer: an error, or the flag does not exist. */
export type FeatureFlagEvaluator = (key: FeatureFlagKey, subject: FeatureFlagSubject) => Promise<boolean | undefined>

interface CachedAnswer {
  value: boolean | undefined
  freshUntil: number
  keepUntil: number
}

function waitAtMost(request: Promise<boolean | undefined>, timeoutMs: number): Promise<boolean | undefined> {
  return new Promise(function settleFirst(resolve) {
    const timer = setTimeout(function giveUp() {
      resolve(undefined)
    }, timeoutMs)

    request.then(function answer(value) {
      clearTimeout(timer)
      resolve(value)
    })
  })
}

/**
 * Wraps an evaluator in a per-person cache. A cold check waits at most 250 ms; a cached answer
 * is served at once and refreshed in the background after a minute; one request per flag and
 * person is in flight at a time.
 */
export function createFeatureFlagCache(evaluate: FeatureFlagEvaluator) {
  const answers = new Map<string, CachedAnswer>()
  const pendingAnswers = new Map<string, Promise<boolean | undefined>>()

  function rememberAnswer(cacheKey: string, value: boolean | undefined) {
    if (answers.size >= MAX_CACHED_ANSWERS) {
      answers.clear()
    }

    const now = Date.now()

    answers.set(cacheKey, { value, freshUntil: now + FRESH_FOR_MS, keepUntil: now + KEEP_FOR_MS })
  }

  function refreshAnswer(key: FeatureFlagKey, subject: FeatureFlagSubject, cacheKey: string): Promise<boolean | undefined> {
    const pending = pendingAnswers.get(cacheKey)

    if (pending) {
      return pending
    }

    const request = (async function askAndRemember() {
      const value = await evaluate(key, subject)

      // A failed refresh leaves the last real answer until it is too old to serve, so one error
      // does not flip a flag that is on back to its default for the next ten minutes.
      const kept = answers.get(cacheKey)
      if (value !== undefined || kept?.value === undefined || Date.now() >= kept.keepUntil) {
        rememberAnswer(cacheKey, value)
      }
      pendingAnswers.delete(cacheKey)

      return value
    })()

    pendingAnswers.set(cacheKey, request)

    return request
  }

  return async function readFlag(key: FeatureFlagKey, subject: FeatureFlagSubject): Promise<boolean | undefined> {
    const cacheKey = `${key}\u0000${subject.userId}`
    const cached = answers.get(cacheKey)
    const now = Date.now()

    if (cached && now < cached.keepUntil) {
      if (now >= cached.freshUntil) {
        void refreshAnswer(key, subject, cacheKey)
      }

      return cached.value
    }

    return waitAtMost(refreshAnswer(key, subject, cacheKey), EVALUATION_TIMEOUT_MS)
  }
}

async function askPosthog(posthog: PostHog, key: FeatureFlagKey, subject: FeatureFlagSubject): Promise<boolean | undefined> {
  try {
    const result = await posthog.getFeatureFlagResult(key, subject.userId, {
      ...(subject.email && { personProperties: { email: subject.email } }),
      // The browser already reports which flags people saw. A server event per check would only
      // add billed events.
      sendFeatureFlagEvents: false
    })

    return result?.enabled
  } catch (error) {
    console.error(`[feature-flags] Failed to evaluate ${key}`, error)
    return undefined
  }
}

let readPosthogFlag: ReturnType<typeof createFeatureFlagCache> | null = null

/**
 * Whether a feature is on for this person. Never throws and never waits on PostHog longer than
 * 250 ms: an override from NUXT_PUBLIC_FEATURE_FLAGS wins, then PostHog's answer, then the
 * default in shared/feature-flags.ts.
 */
export async function isFeatureEnabled(key: FeatureFlagKey, subject: FeatureFlagSubject): Promise<boolean> {
  const override = readFeatureFlagOverrides(resolveRuntimeConfig()?.public)[key]

  if (override !== undefined) {
    return override
  }

  const posthog = getPosthogClient()

  if (!posthog) {
    return resolveFeatureFlag(key, undefined, undefined)
  }

  readPosthogFlag ??= createFeatureFlagCache(function evaluateWithPosthog(flagKey, flagSubject) {
    return askPosthog(posthog, flagKey, flagSubject)
  })

  return resolveFeatureFlag(key, undefined, await readPosthogFlag(key, subject))
}

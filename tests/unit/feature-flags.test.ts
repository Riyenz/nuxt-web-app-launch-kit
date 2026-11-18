import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFeatureFlagCache, type FeatureFlagEvaluator } from '~~/server/utils/feature-flags'
import {
  FEATURE_FLAGS,
  isFeatureFlagKey,
  parseFeatureFlagOverrides,
  readFeatureFlagOverrides,
  resolveFeatureFlag,
  type FeatureFlagKey
} from '~~/shared/feature-flags'

const FLAG: FeatureFlagKey = 'example-flag'
const ALICE = { userId: 'user_alice', email: 'alice@example.com' }
const BOB = { userId: 'user_bob' }

describe('feature flag registry', () => {
  it('ships every flag off by default with a description', () => {
    for (const definition of Object.values(FEATURE_FLAGS)) {
      expect(definition.defaultValue).toBe(false)
      expect(definition.description.length).toBeGreaterThan(0)
    }
  })

  it('recognizes registered keys only', () => {
    expect(isFeatureFlagKey(FLAG)).toBe(true)
    expect(isFeatureFlagKey('not-a-flag')).toBe(false)
    expect(isFeatureFlagKey('toString')).toBe(false)
  })

  it('rejects an unknown key at compile time', () => {
    function readUnknownFlag() {
      // @ts-expect-error an unregistered flag key is a type error, checked by `pnpm typecheck`
      return resolveFeatureFlag('not-a-flag', undefined, undefined)
    }

    expect(readUnknownFlag).toBeTypeOf('function')
  })
})

describe('feature flag overrides', () => {
  it('turns a bare key on and a key set to an off word off', () => {
    expect(parseFeatureFlagOverrides(`${FLAG}`)).toEqual({ [FLAG]: true })

    for (const off of ['false', '0', 'off', 'no', ' FALSE ']) {
      expect(parseFeatureFlagOverrides(`${FLAG}=${off}`)).toEqual({ [FLAG]: false })
    }
  })

  it('ignores unknown keys and a missing value', () => {
    expect(parseFeatureFlagOverrides('nope,also-nope=false')).toEqual({})
    expect(parseFeatureFlagOverrides(undefined)).toEqual({})
  })

  it('turns every flag on when asked, and an explicit override still wins', () => {
    expect(readFeatureFlagOverrides({ isEveryFeatureFlagOn: true })).toEqual({ [FLAG]: true })
    expect(readFeatureFlagOverrides({ isEveryFeatureFlagOn: true, featureFlags: `${FLAG}=false` })).toEqual({ [FLAG]: false })
    expect(readFeatureFlagOverrides({ isEveryFeatureFlagOn: false })).toEqual({})
  })

  it('resolves override, then PostHog, then the default', () => {
    expect(resolveFeatureFlag(FLAG, false, true)).toBe(false)
    expect(resolveFeatureFlag(FLAG, undefined, true)).toBe(true)
    expect(resolveFeatureFlag(FLAG, undefined, undefined)).toBe(FEATURE_FLAGS[FLAG].defaultValue)
  })
})

describe('server feature flag cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function answerAfter(delayMs: number, value: boolean | undefined) {
    return vi.fn<FeatureFlagEvaluator>(() => new Promise(resolve => setTimeout(resolve, delayMs, value)))
  }

  it('returns a fast answer on a cold check', async () => {
    const readFlag = createFeatureFlagCache(answerAfter(50, true))
    const check = readFlag(FLAG, ALICE)

    await vi.advanceTimersByTimeAsync(50)

    await expect(check).resolves.toBe(true)
  })

  it('gives up after 250 ms on a cold check, then serves the late answer from the cache', async () => {
    const evaluate = answerAfter(1000, true)
    const readFlag = createFeatureFlagCache(evaluate)
    const check = readFlag(FLAG, ALICE)

    await vi.advanceTimersByTimeAsync(250)
    await expect(check).resolves.toBeUndefined()

    await vi.advanceTimersByTimeAsync(750)
    await expect(readFlag(FLAG, ALICE)).resolves.toBe(true)
    expect(evaluate).toHaveBeenCalledTimes(1)
  })

  it('asks once for concurrent checks of the same person', async () => {
    const evaluate = answerAfter(100, true)
    const readFlag = createFeatureFlagCache(evaluate)
    const checks = Promise.all([readFlag(FLAG, ALICE), readFlag(FLAG, ALICE)])

    await vi.advanceTimersByTimeAsync(100)

    await expect(checks).resolves.toEqual([true, true])
    expect(evaluate).toHaveBeenCalledTimes(1)
  })

  it('keeps answers per person', async () => {
    const evaluate = vi.fn<FeatureFlagEvaluator>(async (_key, subject) => subject.userId === ALICE.userId)
    const readFlag = createFeatureFlagCache(evaluate)

    await expect(readFlag(FLAG, ALICE)).resolves.toBe(true)
    await expect(readFlag(FLAG, BOB)).resolves.toBe(false)
    expect(evaluate).toHaveBeenCalledTimes(2)
  })

  it('serves a fresh answer without asking again', async () => {
    const evaluate = vi.fn<FeatureFlagEvaluator>(async () => true)
    const readFlag = createFeatureFlagCache(evaluate)

    await readFlag(FLAG, ALICE)
    await vi.advanceTimersByTimeAsync(59_000)
    await readFlag(FLAG, ALICE)

    expect(evaluate).toHaveBeenCalledTimes(1)
  })

  it('serves a stale answer at once and refreshes it in the background', async () => {
    const evaluate = vi.fn<FeatureFlagEvaluator>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    const readFlag = createFeatureFlagCache(evaluate)

    await readFlag(FLAG, ALICE)
    await vi.advanceTimersByTimeAsync(60_000)

    await expect(readFlag(FLAG, ALICE)).resolves.toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    await expect(readFlag(FLAG, ALICE)).resolves.toBe(false)
    expect(evaluate).toHaveBeenCalledTimes(2)
  })

  it('keeps the last real answer when a refresh fails', async () => {
    const evaluate = vi.fn<FeatureFlagEvaluator>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(undefined)
    const readFlag = createFeatureFlagCache(evaluate)

    await readFlag(FLAG, ALICE)
    await vi.advanceTimersByTimeAsync(60_000)
    await readFlag(FLAG, ALICE)
    await vi.advanceTimersByTimeAsync(0)

    await expect(readFlag(FLAG, ALICE)).resolves.toBe(true)
  })

  it('waits again once an answer is ten minutes old', async () => {
    const evaluate = vi.fn<FeatureFlagEvaluator>()
      .mockResolvedValueOnce(true)
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000, true)))
    const readFlag = createFeatureFlagCache(evaluate)

    await readFlag(FLAG, ALICE)
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    const check = readFlag(FLAG, ALICE)
    await vi.advanceTimersByTimeAsync(250)

    await expect(check).resolves.toBeUndefined()
  })
})

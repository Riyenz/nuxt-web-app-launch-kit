import { describe, expect, it } from 'vitest'
import { selectE2eTests } from '../../scripts/ci/select-e2e-tests.mjs'

describe('selectE2eTests', () => {
  it('runs nothing when the diff has no E2E signal', () => {
    const selection = selectE2eTests(['README.md', 'docs/ci-cd.md', 'app/assets/css/main.css'])

    expect(selection.specs).toEqual([])
    expect(selection.isFullSuite).toBe(false)
    expect(selection.skippedFiles).toHaveLength(3)
  })

  it('maps a page change to only the specs that render it', () => {
    const selection = selectE2eTests(['app/pages/app/dashboard.vue'])

    expect(selection.specs).toEqual(['tests/e2e/dashboard.spec.ts'])
    expect(selection.isFullSuite).toBe(false)
  })

  it('runs the full suite for shared infrastructure', () => {
    const selection = selectE2eTests(['prisma/schema.prisma'])

    expect(selection.isFullSuite).toBe(true)
    expect(selection.specs.length).toBeGreaterThan(1)
    expect(selection.matchedRules).toContain('full suite fallback')
  })

  // The safety net: an unclassified runtime file must never be silently skipped,
  // because that is how a rules table goes stale without anyone noticing.
  it('runs the full suite for a runtime file no rule claims', () => {
    const selection = selectE2eTests(['server/api/orders.get.ts'])

    expect(selection.isFullSuite).toBe(true)
    expect(selection.unmatchedRuntimeFiles).toEqual(['server/api/orders.get.ts'])
  })

  it('runs a spec that was edited directly', () => {
    const selection = selectE2eTests(['tests/e2e/login.spec.ts'])

    expect(selection.specs).toEqual(['tests/e2e/login.spec.ts'])
    expect(selection.isFullSuite).toBe(false)
  })

  it('falls back when a spec file is renamed out of existence', () => {
    const selection = selectE2eTests(['tests/e2e/checkout.spec.ts'])

    expect(selection.isFullSuite).toBe(true)
  })

  it('unions the specs of every rule the diff matches', () => {
    const selection = selectE2eTests([
      'app/pages/app/dashboard.vue',
      'server/api/users.get.ts'
    ])

    expect(selection.specs).toEqual([
      'tests/e2e/dashboard.spec.ts',
      'tests/e2e/users-api.spec.ts'
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { isNodeExperimentalWarning, isLoggedRequestPath, toServiceName } from '~~/server/utils/posthog-logs'
import { isReportableError } from '~~/server/utils/posthog'

describe('isReportableError', () => {
  it('reports server errors and errors with no status', () => {
    expect(isReportableError({ statusCode: 500 })).toBe(true)
    expect(isReportableError({ statusCode: 503 })).toBe(true)
    expect(isReportableError(new Error('boom'))).toBe(true)
  })

  it('does not report the API saying no', () => {
    for (const statusCode of [400, 401, 403, 404, 422]) {
      expect(isReportableError({ statusCode })).toBe(false)
    }
  })
})

describe('server logs', () => {
  it('logs the app\'s own API requests only', () => {
    expect(isLoggedRequestPath('/api/users')).toBe(true)
    expect(isLoggedRequestPath('/app/dashboard')).toBe(false)
    expect(isLoggedRequestPath('/_nuxt/entry.js')).toBe(false)
    expect(isLoggedRequestPath('/api/_nuxt_icon/hugeicons.json')).toBe(false)
  })

  it('names the service after the app', () => {
    expect(toServiceName('Launch Kit')).toBe('launch-kit')
    expect(toServiceName('  Acme Billing 2.0 ')).toBe('acme-billing-2-0')
    expect(toServiceName('***')).toBe('app')
  })

  it('skips Node experimental warnings only', () => {
    expect(isNodeExperimentalWarning('(node:42) ExperimentalWarning: WASI is an experimental feature')).toBe(true)
    expect(isNodeExperimentalWarning('Error: ExperimentalWarning in user code')).toBe(false)
  })
})

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createError, type H3Event } from 'h3'
// The handlers below use Nitro's auto-imports, which only this file declares for tsconfig.test.json.
import type {} from '../../.nuxt/types/nitro-imports'

interface TestEvent {
  path: string
  context: { isCronAuthorized?: boolean }
  node: { req: { headers: Record<string, string | undefined> } }
}

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('createError', createError)
vi.stubGlobal('getRequestHeader', (event: TestEvent, name: string) => event.node.req.headers[name])
vi.stubGlobal('useRuntimeConfig', () => ({ contractMigrations: ['20261020000001_drop_code_contract'] }))

const { default: bearerTokenMiddleware } = await import('../../server/middleware/00.bearer-token')
const { default: contractMigrationsRoute } = await import('../../server/api/cron/contract-migrations.get')

const runMiddleware = bearerTokenMiddleware as unknown as (event: H3Event) => void
const callRoute = contractMigrationsRoute as unknown as (event: H3Event) => unknown
const originalCronSecret = process.env.CRON_SECRET

function event(path: string, authorization?: string) {
  return {
    path,
    context: {},
    node: { req: { headers: authorization ? { authorization } : {} } }
  } as unknown as H3Event & TestEvent
}

function statusOf(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return (error as { statusCode?: number }).statusCode
  }
  return null
}

beforeEach(() => {
  process.env.CRON_SECRET = 'cron-secret'
})

afterAll(() => {
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET
  } else {
    process.env.CRON_SECRET = originalCronSecret
  }
})

describe('cron requests', () => {
  it('answers the cron secret with the contract migrations, and hides the secret from Clerk', () => {
    const request = event('/api/cron/contract-migrations', 'Bearer cron-secret')

    runMiddleware(request)

    expect(request.node.req.headers.authorization).toBeUndefined()
    expect(callRoute(request)).toEqual({ contracts: ['20261020000001_drop_code_contract'] })
  })

  it('refuses a wrong or missing secret before the route runs', () => {
    expect(statusOf(() => runMiddleware(event('/api/cron/contract-migrations', 'Bearer wrong')))).toBe(401)
    expect(statusOf(() => runMiddleware(event('/api/cron/contract-migrations')))).toBe(401)
  })

  it('refuses every cron request when the deployment has no CRON_SECRET', () => {
    delete process.env.CRON_SECRET

    expect(statusOf(() => runMiddleware(event('/api/cron/contract-migrations', 'Bearer ')))).toBe(401)
    expect(statusOf(() => runMiddleware(event('/api/cron/contract-migrations', 'Bearer undefined')))).toBe(401)
  })

  it('refuses the route when the middleware did not authorize the request', () => {
    expect(statusOf(() => callRoute(event('/api/cron/contract-migrations', 'Bearer cron-secret')))).toBe(401)
  })

  it('leaves every other request and its Clerk token alone', () => {
    const request = event('/api/users', 'Bearer a.clerk.token')

    runMiddleware(request)

    expect(request.node.req.headers.authorization).toBe('Bearer a.clerk.token')
    expect(request.context.isCronAuthorized).toBeUndefined()
  })
})

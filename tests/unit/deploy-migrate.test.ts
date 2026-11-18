import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { copyMigrationsWithout, findWaitingContracts, readLiveContracts } from '../../scripts/ci/deploy-migrate.mjs'

const PRODUCTION = { VERCEL_PROJECT_PRODUCTION_URL: 'app.example.com', CRON_SECRET: 'secret' }

function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

describe('readLiveContracts', () => {
  it('asks production with the cron secret and returns its list', async () => {
    const fetchImpl = answer(200, { contracts: ['20261020000001_drop_code_contract'] })

    await expect(readLiveContracts(PRODUCTION, fetchImpl)).resolves.toEqual(['20261020000001_drop_code_contract'])
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('https://app.example.com/api/cron/contract-migrations')
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({ authorization: 'Bearer secret' })
  })

  it('falls back to APP_URL when Vercel names no production host', async () => {
    const fetchImpl = answer(200, { contracts: [] })

    await readLiveContracts({ APP_URL: 'http://127.0.0.1:4000', CRON_SECRET: 'secret' }, fetchImpl)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('http://127.0.0.1:4000/api/cron/contract-migrations')
  })

  it('holds every contract back when production cannot answer', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(readLiveContracts({ CRON_SECRET: 'secret' }, answer(200, { contracts: ['x'] }))).resolves.toEqual([])
    await expect(readLiveContracts({ VERCEL_PROJECT_PRODUCTION_URL: 'app.example.com' }, answer(200, { contracts: ['x'] }))).resolves.toEqual([])
    await expect(readLiveContracts(PRODUCTION, answer(401, { contracts: ['x'] }))).resolves.toEqual([])
    await expect(readLiveContracts(PRODUCTION, answer(200, { contracts: 'x' }))).resolves.toEqual([])
    await expect(readLiveContracts(PRODUCTION, vi.fn().mockRejectedValue(new Error('timeout')))).resolves.toEqual([])
  })
})

describe('findWaitingContracts', () => {
  it('keeps only the contracts production was not built with', () => {
    expect(findWaitingContracts(['a_contract', 'b_contract'], ['a_contract'])).toEqual(['b_contract'])
    expect(findWaitingContracts(['a_contract'], [])).toEqual(['a_contract'])
  })
})

describe('copyMigrationsWithout', () => {
  it('copies every migration but the waiting ones', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deploy-migrate-test-'))
    for (const name of ['20261020000000_add_code', '20261020000001_drop_code_contract']) {
      mkdirSync(join(dir, name))
      writeFileSync(join(dir, name, 'migration.sql'), 'SELECT 1;')
    }
    writeFileSync(join(dir, 'migration_lock.toml'), 'provider = "postgresql"')

    const copy = copyMigrationsWithout(dir, ['20261020000001_drop_code_contract'])

    expect(readdirSync(copy).sort()).toEqual(['20261020000000_add_code', 'migration_lock.toml'])
    expect(readdirSync(join(copy, '20261020000000_add_code'))).toEqual(['migration.sql'])
  })
})

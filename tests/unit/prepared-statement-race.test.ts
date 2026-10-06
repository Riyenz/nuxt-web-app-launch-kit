import { describe, expect, it, vi } from 'vitest'
import {
  isPreparedStatementRace,
  retryPreparedStatementRace
} from '../../app/lib/prepared-statement-race'

function raceError() {
  return Object.assign(new Error('bind message supplies 3 parameters, but prepared statement "" requires 0'), {
    code: '08P01'
  })
}

describe('isPreparedStatementRace', () => {
  it('accepts the Postgres protocol-violation code', () => {
    expect(isPreparedStatementRace(raceError())).toBe(true)
  })

  it('accepts the bind-message text when the code is wrapped away', () => {
    expect(isPreparedStatementRace(new Error('Database error. Code: `08P01`. Message: `bind message supplies 4 parameters, but prepared statement "" requires 0`'))).toBe(true)
  })

  it('rejects ordinary errors', () => {
    expect(isPreparedStatementRace(new Error('relation "User" does not exist'))).toBe(false)
    expect(isPreparedStatementRace({ code: '23505' })).toBe(false)
    expect(isPreparedStatementRace(null)).toBe(false)
  })
})

describe('retryPreparedStatementRace', () => {
  it('returns the first success', async () => {
    expect(await retryPreparedStatementRace(async () => 'ok', { waitMs: 0 })).toBe('ok')
  })

  it('retries the unnamed-statement collision and then returns', async () => {
    const run = vi.fn()
      .mockRejectedValueOnce(raceError())
      .mockRejectedValueOnce(raceError())
      .mockResolvedValueOnce('recovered')

    await expect(retryPreparedStatementRace(run, { waitMs: 0 })).resolves.toBe('recovered')
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('does not retry a different database error', async () => {
    const error = Object.assign(new Error('duplicate key'), { code: '23505' })
    const run = vi.fn().mockRejectedValue(error)

    await expect(retryPreparedStatementRace(run, { waitMs: 0 })).rejects.toBe(error)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('gives up after the last attempt', async () => {
    const error = raceError()
    const run = vi.fn().mockRejectedValue(error)

    await expect(retryPreparedStatementRace(run, { attempts: 3, waitMs: 0 })).rejects.toBe(error)
    expect(run).toHaveBeenCalledTimes(3)
  })
})

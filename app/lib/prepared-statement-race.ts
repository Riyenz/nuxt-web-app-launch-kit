const DEFAULT_ATTEMPTS = 8
const DEFAULT_WAIT_MS = 20

export function isPreparedStatementRace(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''

  return code === '08P01' || message.includes('bind message supplies')
}

export async function retryPreparedStatementRace<T>(
  run: () => Promise<T>,
  options: { attempts?: number, waitMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      if (!isPreparedStatementRace(error) || attempt === attempts) {
        throw error
      }

      await new Promise(function wait(resolve) {
        setTimeout(resolve, waitMs * attempt)
      })
    }
  }

  throw lastError
}

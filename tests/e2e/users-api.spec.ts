import { expect, test } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'
import { SEED_USER_COUNT, SEED_USER_EMAIL, SEED_USER_NAME } from './helpers/test-data'

test.describe('GET /api/users', () => {
  test('returns the seeded users with their posts', async ({ page }) => {
    // Signing in first refreshes the replayed session, so the request below carries a
    // live JWT rather than the one captured minutes ago.
    await signInAsOwner(page)

    const response = await page.request.get('/api/users')
    expect(response.ok()).toBe(true)

    const users = await response.json()
    expect(users.length).toBeGreaterThanOrEqual(SEED_USER_COUNT)

    const alice = users.find((user: { email: string }) => user.email === SEED_USER_EMAIL)
    expect(alice).toBeTruthy()
    expect(alice.name).toBe(SEED_USER_NAME)
    expect(alice.posts.length).toBeGreaterThan(0)
  })
})

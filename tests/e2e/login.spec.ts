import { expect, test } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

test.describe('authentication', () => {
  test('a signed-in owner reaches the dashboard', async ({ page }) => {
    await signInAsOwner(page)

    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  })

  test('the landing page renders for a signed-out visitor', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'LaunchKit' }).first()).toBeVisible()
  })

  test('the dashboard is not reachable signed out', async ({ page }) => {
    await page.goto('/app/dashboard')

    // app/middleware/auth.ts throws a 401 rather than redirecting, so the dashboard
    // heading must never render.
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeHidden()
  })
})

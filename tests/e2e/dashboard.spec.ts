import { expect, test } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

test.describe('dashboard', () => {
  test('shows the stat cards and the app shell', async ({ page }) => {
    await signInAsOwner(page)

    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expect(page.getByText('Page Views')).toBeVisible()
    await expect(page.getByText('Visitors')).toBeVisible()
  })
})

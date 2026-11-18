import { expect, test } from '@playwright/test'

test.describe('public pages', () => {
  test('the footer links the legal and trust pages', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms and Conditions', level: 1 })).toBeVisible()

    const legalLinks = page.getByRole('navigation', { name: 'Legal' })

    await legalLinks.getByRole('link', { name: 'Privacy' }).click()
    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible()

    await legalLinks.getByRole('link', { name: 'Support' }).click()
    await expect(page.getByRole('heading', { name: /^Get help with/, level: 1 })).toBeVisible()
  })

  test('each legal page sets its own canonical link', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy$/)
  })

  test('robots.txt keeps crawlers out of the app and points at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt')
    const body = await response.text()

    expect(body).toContain('Disallow: /app/')
    expect(body).toMatch(/^Sitemap: .+\/sitemap\.xml$/m)
  })

  test('the sitemap lists the legal pages', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text()

    for (const path of ['/terms', '/privacy', '/support']) {
      expect(body).toContain(`${path}</loc>`)
    }
  })

  test('API responses may not be stored by any cache', async ({ request }) => {
    const response = await request.get('/api/users')

    expect(response.headers()['cache-control']).toBe('private, no-store')
  })
})

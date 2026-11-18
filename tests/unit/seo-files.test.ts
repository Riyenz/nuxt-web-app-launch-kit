import { describe, expect, it } from 'vitest'
import { buildLlmsTxt, buildRobotsTxt, buildSitemapXml } from '../../server/utils/seo-files'
import { publicPages, resolveSiteUrl } from '../../shared/site'

const siteUrl = 'https://product.test/'

function sitemapLocations(xml: string) {
  return [...xml.matchAll(/<loc>(.+?)<\/loc>/g)].map(function toUrl(match) {
    return match[1]
  })
}

describe('sitemap', () => {
  it('lists the home page and every legal and trust page', () => {
    const xml = buildSitemapXml(siteUrl, new Date('2026-01-01T00:00:00Z'))

    expect(sitemapLocations(xml)).toEqual([
      'https://product.test/',
      'https://product.test/terms',
      'https://product.test/privacy',
      'https://product.test/support'
    ])
  })

  it('never lists a signed-in or API path', () => {
    const xml = buildSitemapXml(siteUrl, new Date())

    expect(xml).not.toMatch(/\/(app|api)\//)
  })
})

describe('robots.txt', () => {
  it('keeps crawlers out of the app and the API and points at the sitemap', () => {
    const lines = buildRobotsTxt(siteUrl).split('\n')

    expect(lines).toContain('Disallow: /app/')
    expect(lines).toContain('Disallow: /api/')
    expect(lines).toContain('Sitemap: https://product.test/sitemap.xml')
  })
})

describe('llms.txt', () => {
  it('links every public page', () => {
    const text = buildLlmsTxt(siteUrl)

    for (const page of publicPages) {
      expect(text).toContain(`- ${page.name}: https://product.test${page.path}`)
    }
  })
})

describe('resolveSiteUrl', () => {
  it('prefers the configured URL without a trailing slash', () => {
    expect(resolveSiteUrl({ NUXT_PUBLIC_SITE_URL: 'https://product.test/' })).toBe('https://product.test')
  })

  it('uses the local dev server in development', () => {
    expect(resolveSiteUrl({ NODE_ENV: 'development' })).toBe('http://localhost:3000')
  })

  it('uses the Vercel production domain on a Vercel build', () => {
    expect(resolveSiteUrl({ NODE_ENV: 'production', VERCEL: '1', VERCEL_PROJECT_PRODUCTION_URL: 'product.test' })).toBe('https://product.test')
  })
})

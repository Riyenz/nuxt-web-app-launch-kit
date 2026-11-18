import { absoluteSiteUrl, privatePathPrefixes, publicPages, site } from '~~/shared/site'

export function buildRobotsTxt(siteUrl: string) {
  return [
    'User-agent: *',
    'Allow: /',
    ...privatePathPrefixes.map(function toDisallow(prefix) {
      return `Disallow: ${prefix}`
    }),
    `Sitemap: ${absoluteSiteUrl(siteUrl, '/sitemap.xml')}`
  ].join('\n')
}

export function buildSitemapXml(siteUrl: string, lastModified: Date) {
  const urls = publicPages.map(function toUrl(page) {
    return [
      '<url>',
      `  <loc>${absoluteSiteUrl(siteUrl, page.path)}</loc>`,
      `  <lastmod>${lastModified.toISOString()}</lastmod>`,
      '</url>'
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>'
  ].join('\n')
}

// The llms.txt convention: a plain summary an AI assistant can read instead of crawling.
export function buildLlmsTxt(siteUrl: string) {
  return [
    `# ${site.name}`,
    '',
    `> ${site.title}`,
    '',
    site.description,
    '',
    '## Public pages',
    ...publicPages.map(function toLine(page) {
      return `- ${page.name}: ${absoluteSiteUrl(siteUrl, page.path)}`
    }),
    '',
    '## Contact',
    `- ${site.contactEmail}`,
    '',
    '## Non-public areas',
    '- /app/* is the signed-in application.',
    '- /api/* is the application API.'
  ].join('\n')
}

import { absoluteSiteUrl, site } from './site'

export type BreadcrumbItem = {
  name: string
  path: string
}

export type StructuredData = Record<string, unknown>

export function createBreadcrumbList(baseUrl: string, items: BreadcrumbItem[]): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map(function toListItem(item, index) {
      return {
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.name,
        'item': absoluteSiteUrl(baseUrl, item.path)
      }
    })
  }
}

// Search engines read the site name shown above a result from this block on the home page.
export function createWebSite(baseUrl: string): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': site.name,
    'description': site.description,
    'url': absoluteSiteUrl(baseUrl, '/')
  }
}

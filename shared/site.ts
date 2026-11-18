export const site = {
  name: 'LaunchKit',
  title: 'Ship your SaaS on a production-ready Nuxt foundation',
  description: 'LaunchKit is a Nuxt starter with authentication, a Postgres database, and a polished UI, so a new product starts on its features instead of its setup.',
  contactEmail: 'support@example.com',
  legalEntity: '[Company legal name]',
  productionUrl: 'https://example.com',
  ogImage: '/og-image.png'
} as const

export type PublicPage = {
  path: string
  name: string
}

export const publicPages: readonly PublicPage[] = [
  { path: '/', name: 'Home' },
  { path: '/terms', name: 'Terms and Conditions' },
  { path: '/privacy', name: 'Privacy Policy' },
  { path: '/support', name: 'Support' }
]

export const privatePathPrefixes = ['/app/', '/api/'] as const

export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env) {
  if (env.NUXT_PUBLIC_SITE_URL) {
    return normalizeSiteUrl(env.NUXT_PUBLIC_SITE_URL)
  }

  if (env.NODE_ENV === 'development' && !env.VERCEL) {
    return 'http://localhost:3000'
  }

  // Vercel sets this on every build, previews included, so links point at the real
  // domain before anyone configures NUXT_PUBLIC_SITE_URL.
  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return site.productionUrl
}

export function normalizeSiteUrl(url: string) {
  return url.replace(/\/+$/, '')
}

export function absoluteSiteUrl(baseUrl: string, path = '/') {
  return new URL(path, `${normalizeSiteUrl(baseUrl)}/`).toString()
}

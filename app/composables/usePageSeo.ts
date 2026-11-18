import { absoluteSiteUrl, site } from '~~/shared/site'
import { createBreadcrumbList, createWebSite } from '~~/shared/structured-data'
import type { BreadcrumbItem, StructuredData } from '~~/shared/structured-data'

export type PageSeoInput = {
  title?: string
  description?: string
  path?: string
  breadcrumbs?: BreadcrumbItem[]
  structuredData?: StructuredData[]
}

export function usePageSeo(input: MaybeRefOrGetter<PageSeoInput> = {}) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const resolved = computed(() => toValue(input))
  const pagePath = computed(() => resolved.value.path ?? route.path)
  const isHome = computed(() => pagePath.value === '/')
  const title = computed(() => {
    const pageTitle = resolved.value.title ?? site.title
    return `${pageTitle} · ${site.name}`
  })
  const description = computed(() => resolved.value.description ?? site.description)
  const canonicalUrl = computed(() => absoluteSiteUrl(config.public.siteUrl, pagePath.value))
  const imageUrl = absoluteSiteUrl(config.public.siteUrl, site.ogImage)

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogImage: imageUrl,
    ogType: 'website',
    ogSiteName: site.name,
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: imageUrl,
    twitterCard: 'summary_large_image'
  })

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl }],
    script: () => {
      const blocks: StructuredData[] = []

      if (isHome.value) {
        blocks.push(createWebSite(config.public.siteUrl))
      }

      if (resolved.value.breadcrumbs?.length) {
        blocks.push(createBreadcrumbList(config.public.siteUrl, resolved.value.breadcrumbs))
      }

      blocks.push(...(resolved.value.structuredData ?? []))

      return blocks.map((data, index) => ({
        key: `page-seo-ld-json-${index}`,
        type: 'application/ld+json',
        textContent: JSON.stringify(data)
      }))
    }
  })
}

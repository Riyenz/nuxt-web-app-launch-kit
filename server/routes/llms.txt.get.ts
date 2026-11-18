import { buildLlmsTxt } from '../utils/seo-files'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return buildLlmsTxt(useRuntimeConfig(event).public.siteUrl)
})

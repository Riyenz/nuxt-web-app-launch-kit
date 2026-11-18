// Renders the link preview card from og-image.html into public/, with the copy taken from
// shared/site.ts. Run `pnpm og` after changing the product name, title or URL.
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { resolveSiteUrl, site } from '../../shared/site'

const here = dirname(fileURLToPath(import.meta.url))
const output = resolve(here, '../../public', site.ogImage.replace(/^\//, ''))

const copy = {
  initial: site.name.charAt(0).toUpperCase(),
  name: site.name,
  title: site.title,
  host: new URL(resolveSiteUrl({ ...process.env, NODE_ENV: 'production' })).host
}

const browser = await chromium.launch()

try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 1200, height: 630 }
  })

  await page.goto(pathToFileURL(join(here, 'og-image.html')).href)
  await page.evaluate(function fill(values: Record<string, string>) {
    for (const element of document.querySelectorAll<HTMLElement>('[data-site]')) {
      const words = (values[element.dataset.site ?? ''] ?? '').split(' ')
      // Unnamed on purpose: tsx wraps named inner functions in a helper the page does not have.
      element.replaceChildren(...words.flatMap(function (word, index) {
        const span = document.createElement('span')
        span.textContent = word
        return index === 0 ? [span] : [' ', span]
      }))
    }
    return document.fonts.ready
  }, copy)
  await page.screenshot({ path: output })

  console.log(`Wrote ${output}`)
} finally {
  await browser.close()
}

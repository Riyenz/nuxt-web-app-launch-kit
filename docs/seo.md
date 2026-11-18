# Site Config, SEO and Legal Pages

**Read this when**: You rename the product, add a public page, change how a page looks in a
search result or a link preview, or fill in the legal pages before launch.

## One config: `shared/site.ts`

`site` holds the product name, title, description, contact email, legal entity name, production
URL and the link preview image. `publicPages` lists every page a search engine may index. Every
surface below reads these two, so renaming the product is a one-file change followed by
`pnpm og`.

| Reads `shared/site.ts` | What it uses |
|---|---|
| `server/routes/robots.txt.get.ts` | Blocks `/app/` and `/api/`, links the sitemap |
| `server/routes/sitemap.xml.get.ts` | Every entry in `publicPages` |
| `server/routes/llms.txt.get.ts` | Name, title, description, `publicPages`, contact email |
| `app/composables/usePageSeo.ts` | Title suffix, default description, preview image |
| `app/pages/{terms,privacy,support}.vue` | Name, contact email, legal entity |
| `scripts/og/render.ts` | Name, title, URL host |
| `nuxt.config.ts` | Prerenders every non-home entry in `publicPages` and the three files |

The builders behind the three routes live in `server/utils/seo-files.ts` and are unit tested in
`tests/unit/seo-files.test.ts`.

## The site URL

Canonical links, the sitemap and the preview image need an absolute URL. `resolveSiteUrl()`
picks the first of:

1. `NUXT_PUBLIC_SITE_URL`, when set.
2. `http://localhost:3000` in local development.
3. `https://$VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets on every build, previews included.
4. `site.productionUrl`.

The sitemap and `robots.txt` are prerendered, so they carry the URL from build time.

## Add a public page

1. Create the page and call `usePageSeo` in its script:

   ```ts
   usePageSeo({
     title: 'Pricing',
     description: `Plans and prices for ${site.name}.`,
     breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }]
   })
   ```

   `usePageSeo` sets the title, description, canonical link, Open Graph and Twitter tags, and
   JSON-LD. With no arguments it uses the site title and description, and on `/` it adds the
   `WebSite` block search engines read the site name from. Pass `structuredData` for anything
   else, such as an FAQ block.
2. Add the page to `publicPages`. The sitemap, `llms.txt` and prerendering pick it up.

## Link preview image

`pnpm og` renders `scripts/og/og-image.html` with Playwright and writes the 1200x630 card to
`public/og-image.png`. Commit the PNG. Change the look in the HTML; the words come from
`shared/site.ts`.

## Legal and trust pages

`/terms`, `/privacy` and `/support` are templates, not legal advice. Before launch:

1. Set `site.legalEntity` and `site.contactEmail`.
2. Replace every bracketed placeholder, such as `[governing law, e.g. the laws of the State of
   Delaware]`, and the `[date]` on each page. This lists what is left:

   ```bash
   rg -o '\[[A-Za-z][^]]*\]' app/pages/terms.vue app/pages/privacy.vue app/pages/support.vue
   ```
3. Have a lawyer in your market read the result.
4. Fill in `docs/incident-response.md`. The privacy policy promises that plan exists.

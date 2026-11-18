import { listContractMigrations } from './scripts/migration-phases.mjs'

if (!process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
}

if (!process.env.NUXT_CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY) {
  process.env.NUXT_CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
}

// Baseline Content-Security-Policy for the authenticated app. Shipped as report-only (see
// securityHeaders) so violations are only logged and nothing is blocked: Clerk and Nuxt both
// rely on inline scripts/styles and third-party origins that have to be confirmed against
// real traffic before this policy can be enforced. Add your own origins here as you add
// services, then switch the header to `Content-Security-Policy` once the log is clean.
const contentSecurityPolicyReportOnly = [
  'default-src \'self\'',
  'base-uri \'self\'',
  'object-src \'none\'',
  'frame-ancestors \'none\'',
  'form-action \'self\'',
  'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com',
  'style-src \'self\' \'unsafe-inline\'',
  'img-src \'self\' data: blob: https://img.clerk.com https://*.clerk.com',
  'font-src \'self\' data:',
  'connect-src \'self\' https://*.clerk.accounts.dev https://*.clerk.com',
  'worker-src \'self\' blob:',
  'frame-src \'self\' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com'
].join('; ')

// Clickjacking protection plus cheap hardening for the signed-in surface. frame-ancestors is
// enforced because the app is never meant to be embedded; the broader policy above stays
// report-only until its allow-list is validated against production traffic.
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': 'frame-ancestors \'none\'',
  'Content-Security-Policy-Report-Only': contentSecurityPolicyReportOnly,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Robots-Tag': 'noindex, nofollow'
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@clerk/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Light is the default theme, not the device setting: a phone left on system dark opened
  // the app in dark mode before anyone chose it. The theme toggle still switches to dark,
  // and that choice is remembered.
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  ui: {
    fonts: process.env.STORYBOOK_DISABLE_NUXT_FONTS !== '1'
  },

  runtimeConfig: {
    // Set only when a preview build created its own Neon branch, never for production or for
    // the `develop` preview, which both use a stored DATABASE_URL. Deliberately not
    // process.env.DATABASE_URL: baking that would put the production password in the build
    // output and in Vercel's build cache, where a rotation cannot reach it.
    // See scripts/ci/vercel-build.mjs and server/plugins/00-database-url.ts.
    databaseUrl: process.env.PREVIEW_DATABASE_URL || '',
    // The contract migrations this build contains. The next production deploy reads them from
    // /api/cron/contract-migrations and applies only those. See docs/prisma-workflow.md.
    contractMigrations: listContractMigrations()
  },

  routeRules: {
    '/': { prerender: false },
    '/app/**': { ssr: false, prerender: false, headers: securityHeaders }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})

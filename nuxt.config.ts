if (!process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
}

if (!process.env.NUXT_CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY) {
  process.env.NUXT_CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
}

// The browser sends analytics to this host: PostHog's own by default, or your reverse proxy
// (docs/analytics.md). posthog-js also loads its recorder from PostHog's asset hosts.
const posthogHost = process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const posthogOrigins = [...new Set([new URL(posthogHost).origin, 'https://*.i.posthog.com'])].join(' ')

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
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com ${posthogOrigins}`,
  'style-src \'self\' \'unsafe-inline\'',
  'img-src \'self\' data: blob: https://img.clerk.com https://*.clerk.com',
  'font-src \'self\' data:',
  `connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com ${posthogOrigins}`,
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
    public: {
      // The product name, also the server's log service name.
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Launch Kit',
      // Set only in Vercel's production environment, so previews, CI and local builds send
      // nothing and test traffic never lands in the real project. See docs/analytics.md.
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost,
      posthogUiHost: process.env.NUXT_PUBLIC_POSTHOG_UI_HOST || '',
      // Forces feature flags without PostHog: `key-a,key-b=false`. Keys and defaults live in
      // shared/feature-flags.ts.
      featureFlags: process.env.NUXT_PUBLIC_FEATURE_FLAGS || '',
      // Every flag is on in a local run and on the develop deploy, so new work is visible before
      // it ships. Production and branch previews keep the defaults.
      isEveryFeatureFlagOn: !process.env.VERCEL_ENV || (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'develop')
    }
  },

  routeRules: {
    '/': { prerender: false },
    '/app/**': { ssr: false, prerender: false, headers: securityHeaders }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    experimental: {
      // Lets server/plugins/posthog.ts find the request behind a console.error, so the log links
      // to that person's session replay.
      asyncContext: true
    }
  },

  vite: {
    optimizeDeps: {
      // Imported only from a client plugin, so Vite's first scan misses it, re-bundles on the
      // first visit and reloads the page in dev, which can cut a Clerk sign-in short.
      include: ['posthog-js']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})

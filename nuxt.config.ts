if (!process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
}

if (!process.env.NUXT_CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY) {
  process.env.NUXT_CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
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

  routeRules: {
    '/': { prerender: false },
    '/app/**': { ssr: false, prerender: false }
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

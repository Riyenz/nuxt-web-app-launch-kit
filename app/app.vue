<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <UIcon
            class="size-6"
            name="hugeicons:building-03"
          />
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <SignedOut>
          <UButton
            icon="hugeicons:login-circle-01"
            aria-label="Login"
            variant="solid"
            label="Login"
            @click="clerk?.openSignIn()"
          />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </template>
    </UHeader>

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <USeparator icon="hugeicons:robotic" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Nuxt Web App Launch Kit • © {{ new Date().getFullYear() }}
        </p>
      </template>

      <template #right>
        <UButton
          to="https://github.com/Riyenz/nuxt-web-app-launch-kit"
          target="_blank"
          icon="hugeicons:github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UFooter>
  </UApp>
</template>

<script lang="ts" setup>
import { useClerk } from '@clerk/vue'

const clerk = useClerk()
const title = 'Nuxt Web App Launch Kit'
const description = 'A production-ready web app launch kit powered by Nuxt UI. Build beautiful, accessible, and performant applications in minutes, not hours.'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image'
})
</script>

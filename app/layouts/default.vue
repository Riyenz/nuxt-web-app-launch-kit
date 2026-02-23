<template>
  <div class="">
    <UHeader
      v-if="!isLanding"
      class="!border-b-0 border-none bg-transparent !backdrop-blur-none"
      :ui="{
        root: 'bg-transparent border-none shadow-none h-(--ui-header-height) sticky top-0 z-50 !backdrop-blur-none !border-b-0',
        container: 'relative flex items-center justify-between gap-3 h-full'
      }"
    >
      <template #left>
        <NuxtLink to="/">
          <UIcon
            class="size-6"
            name="hugeicons:building-03"
          />
        </NuxtLink>
      </template>

      <nav
        class="
          absolute left-1/2 hidden -translate-x-1/2 items-center gap-8
          md:flex
        "
      >
        <NuxtLink
          v-for="item in navLinks"
          :key="item.label"
          :to="item.to"
          class="
            text-sm text-muted transition-colors
            hover:text-default
          "
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <template #right>
        <UColorModeButton />

        <SignedOut>
          <UButton
            icon="hugeicons:login-02"
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
      <slot />
    </UMain>

    <USeparator
      v-if="!isLanding"
      icon="hugeicons:robotic"
    />

    <UFooter
      v-if="!isLanding"
      id="contact"
    >
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
  </div>
</template>

<script lang="ts" setup>
import { useClerk } from '@clerk/vue'

const clerk = useClerk()
const route = useRoute()
const isLanding = computed(() => route.path === '/')

const navLinks = [
  { label: 'Home', to: '/#home' },
  { label: 'Features', to: '/#features' },
  { label: 'Blog', to: '/#blog' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Contact', to: '/#contact' }
]
</script>

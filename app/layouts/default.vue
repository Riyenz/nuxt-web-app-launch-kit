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
      <slot />
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
</script>

<template>
  <div>
    <UPageHero
      title="Nuxt Web App Launch Kit"
      description="Everything you need to save time launching your projects. A modern starter kit for building web apps with the latest Nuxt, Nuxt UI, and Clerk authentication, Prisma for Database Management."
      :links="links"
    />

    <UPageSection
      id="features"
      headline="Features"
      title="Everything you need to build modern web apps"
      description="Start with a solid foundation. This template includes all the essentials for building production-ready applications with Nuxt UI's powerful component system."
      :features="[{
                    icon: 'hugeicons:rocket-01',
                    title: 'Nuxt 4',
                    description: 'Built on the latest Nuxt framework with full TypeScript support, file-based routing, and server-side rendering out of the box.'
                  },
                  {
                    icon: 'hugeicons:paint-brush-04',
                    title: 'Nuxt UI 4',
                    description: 'Beautiful, accessible components powered by Tailwind CSS and Headless UI. Dark mode and customizable themes included.'
                  },
                  {
                    icon: 'hugeicons:authorized',
                    title: 'Clerk Authentication',
                    description: 'Production-ready authentication with social logins, multi-factor auth, and user management. Drop-in components for sign-in and sign-up.'
                  },
                  {
                    icon: 'hugeicons:database',
                    title: 'Prisma Database Management',
                    description: 'Type-safe database access with SQLite. Intuitive schema modeling, automatic migrations, and powerful query capabilities.'
                  },
                  {
                    icon: 'hugeicons:robot-01',
                    title: 'AI Coding Agent Ready',
                    description: 'Optimized for Claude Code and AI assistants with comprehensive documentation, clear conventions, and automated workflows. Ship faster with intelligent code generation.'
                  }]"
    />

    <UPageSection>
      <UPageCTA
        title="Ship multiple apps faster with AI coding agents"
        description="This launch kit is optimized for Claude Code and other AI coding agents. Clone once, ship many times. Build production-ready web apps in hours, not weeks, with intelligent code generation that understands your stack."
        variant="subtle"
        :links="[{
          label: 'View documentation',
          to: 'https://github.com/Riyenz/nuxt-web-app-launch-kit',
          icon: 'hugeicons:github',
          color: 'neutral',
          variant: 'outline'
        }]"
      />
    </UPageSection>
  </div>
</template>

<script lang="ts" setup>
import { useAuth, useClerk } from '@clerk/vue'

const { isSignedIn } = useAuth()
const clerk = useClerk()

const links = computed(() => {
  if (isSignedIn.value) {
    return [
      {
        label: 'View Documentation',
        to: 'https://github.com/Riyenz/nuxt-web-app-launch-kit',
        icon: 'hugeicons:github',
        variant: 'outline',
        color: 'neutral'
      },
      {
        label: 'Dashboard',
        to: '/app/dashboard',
        icon: 'hugeicons:dashboard-browsing'
      }
    ]
  }

  return [
    {
      label: 'View Documentation',
      to: 'https://github.com/Riyenz/nuxt-web-app-launch-kit',
      icon: 'hugeicons:github',
      variant: 'outline',
      color: 'neutral'
    },
    {
      label: 'Login',
      onClick: () => clerk.value?.openSignIn(),
      icon: 'hugeicons:login-circle-01'
    }
  ]
})
</script>

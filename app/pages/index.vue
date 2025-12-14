<template>
  <div>
    <UPageHero
      title="Nuxt Web App Launch Kit"
      description="Everything you need to save time launching your projects. A modern starter kit for building web apps with the latest Nuxt, Nuxt UI, and Clerk authentication, Prisma for Database Management."
      :links="[{
        label: 'View Documentation',
        to: 'https://github.com/Riyenz/nuxt-web-app-launch-kit',
        icon: 'hugeicons:github'
      }]"
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
                    icon: 'hugeicons:palette-01',
                    title: 'Nuxt UI 4',
                    description: 'Beautiful, accessible components powered by Tailwind CSS and Headless UI. Dark mode and customizable themes included.'
                  },
                  {
                    icon: 'hugeicons:lock-password',
                    title: 'Clerk Authentication',
                    description: 'Production-ready authentication with social logins, multi-factor auth, and user management. Drop-in components for sign-in and sign-up.'
                  },
                  {
                    icon: 'hugeicons:database',
                    title: 'Prisma Database Management',
                    description: 'Type-safe database access with SQLite. Intuitive schema modeling, automatic migrations, and powerful query capabilities.'
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

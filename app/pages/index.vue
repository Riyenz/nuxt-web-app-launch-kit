<template>
  <div class="text-slate-900">
    <section
      id="home"
      class="relative overflow-hidden bg-[#0f2028] text-white"
    >
      <div
        class="
          absolute inset-0
          bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)]
          bg-size-[48px_48px] opacity-35
        "
      />
      <div
        class="
          pointer-events-none absolute top-16 -left-24 size-72 rounded-full
          bg-blue-400/30 blur-[120px]
        "
      />
      <div
        class="
          pointer-events-none absolute top-0 right-0 size-72 rounded-full
          bg-blue-500/25 blur-[140px]
        "
      />

      <UContainer
        class="
          relative z-10 px-4 pt-6 pb-24
          sm:px-6
          lg:px-8
        "
      >
        <header
          class="
            rounded-lg border border-white/20 bg-white/5 px-4 py-3
            backdrop-blur-sm
          "
        >
          <div class="flex items-center justify-between gap-4">
            <NuxtLink
              to="/"
              class="flex items-center gap-2"
            >
              <span
                class="
                  flex size-9 items-center justify-center rounded-lg
                  bg-blue-400/20 text-blue-200
                "
              >
                <UIcon
                  name="hugeicons:building-03"
                  class="size-5"
                />
              </span>
              <span class="text-sm font-semibold tracking-wide text-white">LaunchKit</span>
            </NuxtLink>

            <nav
              class="
                hidden items-center gap-7
                md:flex
              "
            >
              <NuxtLink
                v-for="item in navLinks"
                :key="item.label"
                :to="item.to"
                class="
                  text-sm text-white/75 transition-colors
                  hover:text-white
                "
              >
                {{ item.label }}
              </NuxtLink>
            </nav>

            <div class="flex items-center gap-2">
              <UButton
                v-if="isSignedIn"
                to="/app/dashboard"
                label="Dashboard"
                icon="hugeicons:dashboard-browsing"
                size="sm"
                color="primary"
              />
              <UButton
                v-else
                label="Login"
                icon="hugeicons:login-02"
                size="sm"
                variant="outline"
                color="neutral"
                class="
                  border-white/30 bg-white/10 text-white
                  hover:bg-white/20
                "
                @click="openLogin"
              />
            </div>
          </div>
        </header>

        <div class="mx-auto mt-20 max-w-3xl text-center">
          <UBadge
            variant="outline"
            color="primary"
            class="border-blue-300/40 bg-blue-500/15 text-blue-100"
            label="SaaS Boilerplate"
          />

          <h1
            class="
              mt-6 text-4xl/tight font-semibold
              sm:text-5xl
              lg:text-6xl
            "
          >
            Cross-app delivery made simple.
          </h1>
          <p
            class="
              mx-auto mt-6 max-w-2xl text-base text-white/75
              sm:text-lg
            "
          >
            Ship secure SaaS products faster with a production-ready Nuxt foundation including auth,
            database tooling, and polished UI patterns.
          </p>

          <div
            class="
              mt-10 flex flex-col justify-center gap-4
              sm:flex-row
            "
          >
            <UButton
              v-if="isSignedIn"
              to="/app/dashboard"
              label="Open dashboard"
              icon="hugeicons:dashboard-browsing"
              size="xl"
            />
            <UButton
              v-else
              label="Start with login"
              icon="hugeicons:login-02"
              size="xl"
              @click="openLogin"
            />
            <UButton
              label="Read docs"
              to="https://github.com/Riyenz/nuxt-web-app-launch-kit"
              target="_blank"
              icon="hugeicons:github"
              size="xl"
              variant="outline"
              color="neutral"
              class="
                border-white/35 bg-white/10 text-white
                hover:bg-white/20
              "
            />
          </div>
        </div>

        <div class="relative mx-auto mt-16 max-w-5xl px-4 pb-10">
          <div
            class="
              mx-auto max-w-2xl rounded-lg border border-white/15 bg-white/95
              p-5 text-slate-900 shadow-2xl shadow-black/20
              sm:p-7
            "
          >
            <div
              class="
                flex flex-col gap-6
                sm:flex-row sm:items-center sm:justify-between
              "
            >
              <div>
                <p
                  class="
                    text-xs font-medium tracking-[0.2em] text-slate-500
                    uppercase
                  "
                >
                  Build velocity
                </p>
                <p
                  class="
                    mt-2 text-2xl font-semibold text-slate-900
                    sm:text-3xl
                  "
                >
                  4x faster project launch
                </p>
              </div>
              <div
                class="grid grid-cols-2 gap-2 text-sm text-slate-600"
              >
                <div class="rounded-lg bg-slate-50 p-2">
                  Nuxt 4 + UI 4
                </div>
                <div class="rounded-lg bg-slate-50 p-2">
                  Clerk Auth
                </div>
                <div class="rounded-lg bg-slate-50 p-2">
                  Prisma ORM
                </div>
                <div class="rounded-lg bg-slate-50 p-2">
                  Deploy-ready
                </div>
              </div>
            </div>
          </div>

          <UCard
            class="
              pointer-events-none absolute -bottom-8 -left-12 hidden w-44
              border-white/50 bg-white text-slate-900 shadow-xl
              lg:block
            "
          >
            <p class="text-xs text-slate-500">
              New installs
            </p>
            <p class="mt-2 text-xl font-semibold">
              2,340
            </p>
            <p class="mt-1 text-xs text-blue-600">
              +12.4% this week
            </p>
          </UCard>

          <UCard
            class="
              pointer-events-none absolute -right-16 -bottom-10 hidden w-52
              border-white/50 bg-white text-slate-900 shadow-xl
              lg:block
            "
          >
            <p class="text-xs text-slate-500">
              Current status
            </p>
            <p class="mt-2 text-base font-semibold">
              Ready for production
            </p>
            <div
              class="
                mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3
                py-1 text-xs font-medium text-blue-700
              "
            >
              <span class="size-2 rounded-full bg-blue-500" />
              Stable release
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <section
      id="clients"
      class="scroll-mt-28 bg-white py-20"
    >
      <UContainer
        class="
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div class="text-center">
          <p class="text-sm tracking-[0.24em] text-slate-500 uppercase">
            Trusted by SaaS teams
          </p>
          <h2
            class="
              mt-3 text-3xl font-semibold text-slate-900
              sm:text-4xl
            "
          >
            Our Recent Clients & Partners
          </h2>
          <p class="mt-3 text-slate-600">
            Join thousands of product teams shipping faster.
          </p>
        </div>

        <div
          class="
            mt-10 grid grid-cols-2 gap-4
            sm:grid-cols-3
            lg:grid-cols-5
          "
        >
          <div
            v-for="client in clients"
            :key="client.name"
            class="
              flex items-center justify-center gap-2 rounded-2xl border
              border-slate-200 bg-slate-50 p-4 text-slate-600
            "
          >
            <UIcon
              :name="client.icon"
              class="size-5"
            />
            <span class="text-sm font-medium">{{ client.name }}</span>
          </div>
        </div>
      </UContainer>
    </section>

    <section
      id="features"
      class="scroll-mt-28 bg-[#f4f7f8] py-20"
    >
      <UContainer
        class="
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div class="mx-auto max-w-2xl text-center">
          <UBadge
            label="Features"
            variant="outline"
            color="primary"
          />
          <h2
            class="
              mt-5 text-3xl font-semibold text-slate-900
              sm:text-5xl
            "
          >
            Banking-grade polish for a SaaS launch stack
          </h2>
          <p class="mt-4 text-slate-600">
            Keep the look and confidence of high-end fintech pages while staying focused on your own SaaS product story.
          </p>
        </div>

        <div
          class="
            mt-12 grid gap-5
            md:grid-cols-2
            lg:grid-cols-3
          "
        >
          <UCard
            v-for="feature in features"
            :key="feature.title"
            class="border-slate-200/80 bg-white"
          >
            <div class="space-y-4">
              <span
                class="
                  inline-flex size-11 items-center justify-center rounded-lg
                  bg-blue-100 text-blue-700
                "
              >
                <UIcon
                  :name="feature.icon"
                  class="size-5"
                />
              </span>
              <h3 class="text-lg font-semibold text-slate-900">
                {{ feature.title }}
              </h3>
              <p class="text-sm/relaxed text-slate-600">
                {{ feature.description }}
              </p>
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <section
      id="pricing"
      class="
        relative scroll-mt-28 overflow-hidden bg-[#0f2028] py-24 text-white
      "
    >
      <div
        class="
          pointer-events-none absolute top-0 left-0 size-72 rounded-full
          bg-blue-400/20 blur-[120px]
        "
      />
      <div
        class="
          pointer-events-none absolute right-0 bottom-0 size-72 rounded-full
          bg-blue-500/15 blur-[120px]
        "
      />

      <UContainer
        class="
          relative z-10 px-4
          sm:px-6
          lg:px-8
        "
      >
        <div class="mx-auto max-w-2xl text-center">
          <UBadge
            label="Pricing"
            color="primary"
            variant="soft"
            class="text-emerald-100"
          />
          <h2
            class="
              mt-6 text-3xl font-semibold
              sm:text-5xl
            "
          >
            Select a plan that scales with your launch
          </h2>
          <p class="mt-4 text-white/75">
            Predictable plans designed for founders and product teams shipping with Nuxt.
          </p>
        </div>

        <div
          class="
            mt-12 grid gap-6
            lg:grid-cols-3
          "
        >
          <UCard
            v-for="plan in plans"
            :key="plan.name"
            :class="plan.featured ? `
              border-blue-300/50 bg-blue-400/10 shadow-2xl shadow-blue-950/40
            ` : `border-white/15 bg-white/5`"
          >
            <div class="space-y-6">
              <div>
                <p
                  class="
                    text-sm font-medium tracking-[0.18em] text-white/70
                    uppercase
                  "
                >
                  {{ plan.name }}
                </p>
                <p class="mt-3 text-4xl font-semibold">
                  {{ plan.price }}
                </p>
                <p class="mt-2 text-sm text-white/70">
                  {{ plan.description }}
                </p>
              </div>

              <ul class="space-y-2 text-sm text-white/85">
                <li
                  v-for="item in plan.items"
                  :key="item"
                  class="flex items-center gap-2"
                >
                  <UIcon
                    name="hugeicons:tick-02"
                    class="size-4 text-blue-300"
                  />
                  <span>{{ item }}</span>
                </li>
              </ul>

              <UButton
                :label="plan.cta"
                block
                size="lg"
                :variant="plan.featured ? 'solid' : 'outline'"
                :color="plan.featured ? 'primary' : 'neutral'"
                :class="plan.featured ? '' : `
                  border-white/35 bg-white/10 text-white
                  hover:bg-white/20
                `"
                @click="handlePrimaryAction"
              />
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <section
      id="feedback"
      class="scroll-mt-28 bg-white py-20"
    >
      <UContainer
        class="
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div class="mx-auto max-w-2xl text-center">
          <UBadge
            label="Testimonials"
            variant="outline"
            color="primary"
          />
          <h2
            class="
              mt-5 text-3xl font-semibold text-slate-900
              sm:text-5xl
            "
          >
            Real Feedback from SaaS Builders
          </h2>
          <p class="mt-4 text-slate-600">
            Teams using this boilerplate report faster releases and cleaner onboarding.
          </p>
        </div>

        <div
          class="
            mt-12 grid gap-5
            md:grid-cols-2
            lg:grid-cols-3
          "
        >
          <UCard
            v-for="item in testimonials"
            :key="item.name"
            class="border-slate-200 bg-slate-50"
          >
            <p class="text-sm/relaxed text-slate-700">
              "{{ item.quote }}"
            </p>
            <div class="mt-5 flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  {{ item.name }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ item.role }}
                </p>
              </div>
              <div class="flex items-center gap-1 text-amber-500">
                <UIcon
                  v-for="star in 5"
                  :key="`${item.name}-${star}`"
                  name="hugeicons:favourite"
                  class="size-3.5"
                />
              </div>
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <section
      id="cta"
      class="scroll-mt-28 bg-[#f4f7f8] py-20"
    >
      <UContainer
        class="
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          class="
            relative overflow-hidden rounded-lg bg-[#10252f] px-6 py-16
            text-center text-white
            sm:px-10
          "
        >
          <div
            class="
              pointer-events-none absolute top-0 -left-16 size-60 rounded-full
              bg-blue-400/20 blur-[100px]
            "
          />
          <div
            class="
              pointer-events-none absolute -right-16 bottom-0 size-60
              rounded-full bg-blue-500/20 blur-[120px]
            "
          />
          <div class="relative z-10 mx-auto max-w-2xl">
            <UBadge
              label="Get Started"
              color="primary"
              variant="soft"
              class="text-emerald-100"
            />
            <h2
              class="
                mt-6 text-3xl font-semibold
                sm:text-5xl
              "
            >
              Empower your next SaaS launch
            </h2>
            <p class="mt-4 text-white/75">
              Clone once, customize quickly, and deliver production-ready apps with less setup overhead.
            </p>
            <div
              class="
                mt-8 flex flex-col justify-center gap-4
                sm:flex-row
              "
            >
              <UButton
                v-if="isSignedIn"
                to="/app/dashboard"
                label="Go to dashboard"
                icon="hugeicons:dashboard-browsing"
                size="xl"
              />
              <UButton
                v-else
                label="Login to begin"
                icon="hugeicons:login-02"
                size="xl"
                @click="openLogin"
              />
              <UButton
                to="https://github.com/Riyenz/nuxt-web-app-launch-kit"
                target="_blank"
                label="View GitHub"
                icon="hugeicons:github"
                size="xl"
                variant="outline"
                color="neutral"
                class="
                  border-white/35 bg-white/10 text-white
                  hover:bg-white/20
                "
              />
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section
      id="footer"
      class="bg-[#0a151a] py-16 text-white"
    >
      <UContainer
        class="
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          class="
            grid gap-10 border-b border-white/10 pb-12
            lg:grid-cols-[1.2fr,2fr]
          "
        >
          <div>
            <div class="flex items-center gap-3">
              <span
                class="
                  flex size-10 items-center justify-center rounded-lg
                  bg-blue-400/20 text-blue-200
                "
              >
                <UIcon
                  name="hugeicons:building-03"
                  class="size-5"
                />
              </span>
              <span class="text-lg font-semibold">Nuxt Launch Kit</span>
            </div>
            <p class="mt-4 max-w-sm text-sm text-white/70">
              A modern SaaS boilerplate with Nuxt UI, Clerk auth, and Prisma to help you ship with confidence.
            </p>
          </div>

          <div
            class="
              grid gap-8
              sm:grid-cols-3
            "
          >
            <div
              v-for="column in footerColumns"
              :key="column.title"
            >
              <h3
                class="
                  text-sm font-semibold tracking-[0.16em] text-white/70
                  uppercase
                "
              >
                {{ column.title }}
              </h3>
              <ul class="mt-4 space-y-3 text-sm">
                <li
                  v-for="link in column.links"
                  :key="link.label"
                >
                  <NuxtLink
                    :to="link.to"
                    class="
                      text-white/75 transition-colors
                      hover:text-white
                    "
                  >
                    {{ link.label }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div
          class="
            mt-6 flex flex-col gap-4 text-sm text-white/60
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <p>Nuxt Web App Launch Kit • © {{ currentYear }}</p>
          <div class="flex items-center gap-3">
            <UButton
              to="https://github.com/Riyenz/nuxt-web-app-launch-kit"
              target="_blank"
              icon="hugeicons:github"
              aria-label="GitHub"
              color="neutral"
              variant="ghost"
              class="
                text-white/80
                hover:text-white
              "
            />
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { useAuth, useClerk } from '@clerk/vue'

const { isSignedIn } = useAuth()
const clerk = useClerk()

const currentYear = new Date().getFullYear()

const navLinks = [
  { label: 'Home', to: '/#home' },
  { label: 'Clients', to: '/#clients' },
  { label: 'Features', to: '/#features' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Feedback', to: '/#feedback' }
]

const clients = [
  { name: 'Ephemeral', icon: 'hugeicons:link-01' },
  { name: 'Wildcrafted', icon: 'hugeicons:leaf-03' },
  { name: 'Codecraft', icon: 'hugeicons:code' },
  { name: 'Convergence', icon: 'hugeicons:flow-connection' },
  { name: 'ImgCompress', icon: 'hugeicons:image-01' },
  { name: 'Epicurious', icon: 'hugeicons:chef' },
  { name: 'Watchtower', icon: 'hugeicons:security-check' },
  { name: 'Renaissance', icon: 'hugeicons:paint-board' },
  { name: 'ContrastAI', icon: 'hugeicons:ai-innovation-01' },
  { name: 'Nietzsche', icon: 'hugeicons:book-04' }
]

const features = [
  {
    icon: 'hugeicons:rocket-01',
    title: 'Launch in days, not weeks',
    description: 'Prebuilt app structure and polished starter pages eliminate setup drag.'
  },
  {
    icon: 'hugeicons:authorized',
    title: 'Clerk authentication included',
    description: 'Built-in login, protected routes, and user sessions for production use.'
  },
  {
    icon: 'hugeicons:database',
    title: 'Prisma-first data layer',
    description: 'Type-safe schema and migrations so feature delivery stays predictable.'
  },
  {
    icon: 'hugeicons:paint-brush-04',
    title: 'Nuxt UI v4 design system',
    description: 'Composable components with configurable theming and consistent spacing.'
  },
  {
    icon: 'hugeicons:cloud-upload',
    title: 'Deployment-ready workflow',
    description: 'Project conventions and scripts tuned for clean CI/CD handoff.'
  },
  {
    icon: 'hugeicons:robot-01',
    title: 'AI coding agent friendly',
    description: 'Clear architecture and docs optimized for AI-assisted development loops.'
  }
]

const plans = [
  {
    name: 'Starter',
    price: '$0 / mo',
    description: 'For validating early ideas.',
    cta: 'Use starter',
    featured: false,
    items: ['Core landing page', 'Auth scaffolding', 'PostgreSQL + Prisma', 'Basic docs']
  },
  {
    name: 'Growth',
    price: '$49 / mo',
    description: 'For teams shipping fast.',
    cta: 'Choose growth',
    featured: true,
    items: ['All starter features', 'Premium templates', 'Priority updates', 'Agent workflow playbooks']
  },
  {
    name: 'Scale',
    price: '$99 / mo',
    description: 'For multi-product orgs.',
    cta: 'Choose scale',
    featured: false,
    items: ['Everything in growth', 'Team enablement guides', 'Architecture review pack', 'Advanced support']
  }
]

const testimonials = [
  {
    name: 'Maya Tran',
    role: 'Founder, NebulaFlow',
    quote: 'We went from blank repo to customer demo in under a week with fewer regressions than usual.'
  },
  {
    name: 'Leo Patel',
    role: 'Product Lead, ParcelPilot',
    quote: 'The structure is clean enough that our team and AI assistants can both move quickly.'
  },
  {
    name: 'Nora Kim',
    role: 'Engineer, ByteForge',
    quote: 'Auth and data access were production-ready out of the box, so we focused on product value.'
  },
  {
    name: 'Caleb Shaw',
    role: 'CTO, QuantaDesk',
    quote: 'Nuxt UI theming made it easy to align the product surface with our brand in one sprint.'
  },
  {
    name: 'Sara Gomez',
    role: 'PM, StudioScale',
    quote: 'Our onboarding checklist got shorter and our velocity reports looked immediately healthier.'
  },
  {
    name: 'Jonas Reed',
    role: 'Indie Hacker',
    quote: 'It feels opinionated in the right places without locking us into rigid implementation choices.'
  }
]

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/#features' },
      { label: 'Pricing', to: '/#pricing' },
      { label: 'Feedback', to: '/#feedback' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', to: 'https://github.com/Riyenz/nuxt-web-app-launch-kit' },
      { label: 'Dashboard', to: '/app/dashboard' },
      { label: 'Documentation', to: 'https://github.com/Riyenz/nuxt-web-app-launch-kit#readme' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'Home', to: '/#home' },
      { label: 'Clients', to: '/#clients' },
      { label: 'Contact', to: '/#footer' }
    ]
  }
]

function openLogin() {
  clerk.value?.openSignIn()
}

function handlePrimaryAction() {
  if (isSignedIn.value) {
    void navigateTo('/app/dashboard')
    return
  }

  openLogin()
}
</script>

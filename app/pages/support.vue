<template>
  <div class="text-default">
    <UContainer
      class="
        pt-12 pb-20
        sm:pt-16
      "
    >
      <div class="mx-auto max-w-3xl">
        <div
          class="
            inline-flex items-center gap-2 rounded-full border border-default
            px-3.5 py-1.5 text-xs font-medium text-primary
          "
        >
          <UIcon
            name="hugeicons:customer-support"
            class="size-3.5"
          />
          Support
        </div>

        <h1
          class="
            mt-6 text-4xl font-semibold tracking-tight text-highlighted
            sm:text-5xl
          "
        >
          Get help with {{ site.name }}
        </h1>
        <p class="mt-6 text-base/relaxed text-muted">
          Email us at
          <a
            :href="`mailto:${site.contactEmail}`"
            class="
              font-medium text-primary
              hover:underline
            "
          >{{ site.contactEmail }}</a>.
          Tell us what you were doing and what you see on the screen, and a person from
          the {{ site.name }} team writes back.
        </p>

        <div class="mt-12 flex flex-col gap-10">
          <section
            v-for="section in sections"
            :id="section.id"
            :key="section.title"
            class="scroll-mt-24"
          >
            <h2
              class="
                text-xl font-semibold text-highlighted
                sm:text-2xl
              "
            >
              {{ section.title }}
            </h2>
            <p class="mt-4 leading-relaxed text-muted">
              {{ section.text }}
            </p>
            <NuxtLink
              v-if="section.link"
              :to="section.link.to"
              class="
                mt-3 inline-block text-sm font-medium text-primary
                hover:underline
              "
            >
              {{ section.link.label }}
            </NuxtLink>
          </section>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { site } from '~~/shared/site'

// Bracketed text is a placeholder a founder replaces before launch; it is not legal advice.
usePageSeo({
  title: 'Support',
  description: `Get help with ${site.name}: email the team, fix sign-in problems, or delete your account.`,
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Support', path: '/support' }
  ]
})

interface SupportSection {
  /** An anchor that a store listing links to, such as /support#delete-account. */
  id?: string
  title: string
  text: string
  link?: { label: string, to: string }
}

const sections: SupportSection[] = [
  {
    title: 'Sign-in problems',
    text: 'Sign in with the email address you used to register. If the verification code does not arrive, check your spam folder, then request a new one. Still stuck? Email us and we will help you get back in.'
  },
  {
    id: 'delete-account',
    title: 'Delete your account',
    text: `In ${site.name}, open [path to account deletion in the app, e.g. Account settings, then Delete account]. No access to the app? Email ${site.contactEmail} from the address on your account and write "Delete my ${site.name} account". We close the account and sign you out on every device. We keep some records for [retention period] and then delete them. Email us to have them deleted sooner.`
  },
  {
    title: 'Your data',
    text: 'Our privacy policy says what we keep, why, and how to ask for a copy.',
    link: { label: 'Read the privacy policy', to: '/privacy' }
  }
]
</script>

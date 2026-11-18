import { readFeatureFlagOverrides, resolveFeatureFlag, type FeatureFlagKey } from '~~/shared/feature-flags'

/**
 * Whether a feature is on for the signed-in person. Starts at the default in
 * shared/feature-flags.ts and flips when PostHog's answer arrives, so it never holds up a render.
 * NUXT_PUBLIC_FEATURE_FLAGS overrides it without asking PostHog.
 */
export function useFeatureFlag(key: FeatureFlagKey): Readonly<Ref<boolean>> {
  const nuxtApp = useNuxtApp()
  const override = readFeatureFlagOverrides(useRuntimeConfig().public)[key]
  const isEnabled = ref(resolveFeatureFlag(key, override, undefined))
  const posthog = nuxtApp.$posthog

  if (override !== undefined || !posthog) {
    return readonly(isEnabled)
  }

  const client = posthog
  let stopListening: (() => void) | null = null
  let isStopped = false

  // fresh: a value posthog-js kept in localStorage from an earlier visit may belong to a flag that
  // has since been turned off, so only an answer from this page load counts.
  function readFlag() {
    isEnabled.value = resolveFeatureFlag(key, undefined, client.isFeatureEnabled(key, { fresh: true }))
  }

  function listen() {
    if (isStopped) {
      return
    }

    stopListening = client.onFeatureFlags(readFlag)
  }

  // The server render has no PostHog, so the hydrating render has to match it before a flag can
  // change the markup.
  if (nuxtApp.isHydrating) {
    nuxtApp.hooks.hookOnce('app:suspense:resolve', listen)
  } else {
    listen()
  }

  if (getCurrentScope()) {
    onScopeDispose(function stop() {
      isStopped = true
      stopListening?.()
    })
  }

  return readonly(isEnabled)
}

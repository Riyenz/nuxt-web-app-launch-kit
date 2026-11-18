// Every feature flag the code reads, keyed by its PostHog flag key. See docs/feature-flags.md.
//
// defaultValue is what a person gets whenever PostHog has no answer: no key configured (CI, e2e,
// previews), an ad blocker, an outage, or a reply slower than the timeout. It must be the safe
// value, which for a new feature is off.
export interface FeatureFlagDefinition {
  defaultValue: boolean
  description: string
}

export const FEATURE_FLAGS = {
  'example-flag': {
    defaultValue: false,
    description: 'Gates nothing. Copy this entry for your first real flag, then delete it.'
  }
} as const satisfies Record<string, FeatureFlagDefinition>

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS

export type FeatureFlagOverrides = Partial<Record<FeatureFlagKey, boolean>>

const OFF_VALUES = new Set(['false', '0', 'off', 'no'])

export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, key)
}

/**
 * Reads NUXT_PUBLIC_FEATURE_FLAGS, which forces flags without asking PostHog:
 * `new-billing,old-banner=false` turns new-billing on and old-banner off. A key that is not in
 * the registry is ignored.
 */
export function parseFeatureFlagOverrides(value: unknown): FeatureFlagOverrides {
  const overrides: FeatureFlagOverrides = {}

  if (typeof value !== 'string') {
    return overrides
  }

  for (const entry of value.split(',')) {
    const [rawKey = '', rawSetting] = entry.split('=')
    const key = rawKey.trim()

    if (!isFeatureFlagKey(key)) {
      continue
    }

    const setting = rawSetting?.trim().toLowerCase()

    overrides[key] = setting === undefined || !OFF_VALUES.has(setting)
  }

  return overrides
}

export interface FeatureFlagConfig {
  featureFlags?: unknown
  isEveryFeatureFlagOn?: unknown
}

export function readFeatureFlagOverrides(config: FeatureFlagConfig | undefined): FeatureFlagOverrides {
  const everyFlagOn: FeatureFlagOverrides = {}

  if (config?.isEveryFeatureFlagOn === true) {
    for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
      everyFlagOn[key] = true
    }
  }

  return { ...everyFlagOn, ...parseFeatureFlagOverrides(config?.featureFlags) }
}

/** An override wins, then PostHog's answer, then the registry default. */
export function resolveFeatureFlag(key: FeatureFlagKey, override: boolean | undefined, posthogValue: boolean | undefined): boolean {
  if (override !== undefined) {
    return override
  }

  if (posthogValue !== undefined) {
    return posthogValue
  }

  return FEATURE_FLAGS[key].defaultValue
}

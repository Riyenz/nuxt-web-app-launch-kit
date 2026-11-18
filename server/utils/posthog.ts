import { PostHog } from 'posthog-node'

// Exceptions raised before a request has a signed-in user (a webhook, a signed-out call) share
// one id rather than minting a throwaway person profile per failure.
const ANONYMOUS_DISTINCT_ID = 'server'

let client: PostHog | null = null
let isClientResolved = false

// useRuntimeConfig is a Nitro auto-import, not a module export, so it does not exist when a unit
// test imports a module that reaches this file. Analytics must never be the reason code throws,
// so a missing context resolves to "no client" rather than a ReferenceError.
export function resolveRuntimeConfig() {
  if (typeof useRuntimeConfig !== 'function') {
    return null
  }

  try {
    return useRuntimeConfig()
  } catch {
    return null
  }
}

export function getPosthogClient(): PostHog | null {
  if (isClientResolved) {
    return client
  }

  isClientResolved = true

  const config = resolveRuntimeConfig()
  const posthogKey = config?.public.posthogKey

  // Mirrors app/plugins/posthog.client.ts: no key, or a dev run, means no analytics.
  if (!config || !posthogKey || import.meta.dev) {
    return client
  }

  client = new PostHog(posthogKey, {
    host: config.public.posthogHost,
    // Serverless instances freeze the moment a response is sent, so a batching queue would
    // strand events. Send on capture and let the Nitro plugin await the flush.
    flushAt: 1,
    flushInterval: 0,
    // One short try per flag check. server/utils/feature-flags.ts waits 250 ms for it, and a
    // slower answer still lands in its cache for the next request.
    featureFlagsRequestTimeoutMs: 2500,
    featureFlagsRequestMaxRetries: 0
  })

  return client
}

// Every event the server captures, so a typo is a type error rather than a new event in
// PostHog. See docs/analytics.md.
export const SERVER_EVENTS = {
  example_event: {
    description: 'Captured nowhere. Copy this entry for your first server event, then delete it.'
  }
} as const satisfies Record<string, { description: string }>

export type ServerEventName = keyof typeof SERVER_EVENTS

interface ServerEvent {
  // The Clerk user id. The browser identifies people by the same id (app/plugins/posthog.client.ts),
  // so a server event lands on the same person as their pageviews and replays.
  distinctId: string
  event: ServerEventName
  properties?: Record<string, unknown>
}

/** Fire and forget: never throws, and the Nitro plugin flushes it after the response. */
export function capturePosthogEvent(serverEvent: ServerEvent) {
  getPosthogClient()?.capture({
    distinctId: serverEvent.distinctId,
    event: serverEvent.event,
    properties: serverEvent.properties
  })
}

export function getErrorStatusCode(error: unknown): number {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const { statusCode } = error as { statusCode?: unknown }

    if (typeof statusCode === 'number') {
      return statusCode
    }
  }

  return 500
}

// 4xx is how the API says no: a wrong input, a missing record, a signed-out call. Forwarding
// those would bury the real failures.
export function isReportableError(error: unknown): boolean {
  return getErrorStatusCode(error) >= 500
}

interface ServerException {
  distinctId?: string | null
  properties?: Record<string, unknown>
}

export function capturePosthogException(error: unknown, exception: ServerException = {}) {
  const posthog = getPosthogClient()

  if (!posthog) {
    return
  }

  if (!exception.distinctId) {
    posthog.captureException(error, ANONYMOUS_DISTINCT_ID, {
      ...exception.properties,
      $process_person_profile: false
    })
    return
  }

  posthog.captureException(error, exception.distinctId, exception.properties)
}

export async function flushPosthog() {
  if (!client) {
    return
  }

  try {
    await client.flush()
  } catch (error) {
    // Analytics delivery must never fail a request that already produced a response.
    console.error('[posthog] Failed to flush events', error)
  }
}

export async function shutdownPosthog() {
  if (!client) {
    return
  }

  try {
    await client.shutdown()
  } catch (error) {
    console.error('[posthog] Failed to shut down', error)
  }
}

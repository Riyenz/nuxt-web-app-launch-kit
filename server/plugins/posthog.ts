import type { Attributes } from '@opentelemetry/api'
import { waitUntil } from '@vercel/functions'
import type { H3Event } from 'h3'
import { useEvent } from 'nitropack/runtime'
import { capturePosthogException, flushPosthog, getErrorStatusCode, isReportableError, shutdownPosthog } from '../utils/posthog'
import { flushPosthogLogs, forwardConsoleToPosthogLogs, getRequestLogAttributes, isLoggedRequestPath, logRequest, shutdownPosthogLogs } from '../utils/posthog-logs'
import { toReportedPath } from '../utils/reported-path'
import { startRequestMetrics } from '../utils/request-metrics'

// The browser identifies people by their Clerk user id, so an exception carries the same id to
// land on that person and their session replay.
function resolveDistinctId(event: H3Event | undefined): string | null {
  try {
    return event?.context.auth?.().userId ?? null
  } catch {
    // The request is already failing. A route the Clerk middleware never reached must not bury
    // the original error under a second one.
    return null
  }
}

// nitro.experimental.asyncContext (nuxt.config.ts) makes the current request reachable from any
// code a handler runs, so a console.error deep in a util still lands on the right replay.
// Nitro's own "[request error]" line prints after the handler, outside that context; the
// request's log line beside it carries the link.
function getCurrentEvent(): H3Event | undefined {
  try {
    return useEvent()
  } catch {
    // Outside a request: start-up, a plugin, a timer.
    return undefined
  }
}

function getCurrentRequestAttributes(): Attributes {
  const event = getCurrentEvent()

  return event ? getRequestLogAttributes(event) : {}
}

export default defineNitroPlugin((nitroApp) => {
  const requestStartTimes = new WeakMap<H3Event, number>()

  // Whichever hook sees the request last writes its one line.
  function logPendingRequest(event: H3Event) {
    const startedAt = requestStartTimes.get(event)

    if (startedAt === undefined) {
      return
    }

    requestStartTimes.delete(event)
    logRequest(event, Math.round(performance.now() - startedAt))
  }

  async function reportError(error: unknown, event: H3Event | undefined) {
    if (event) {
      logPendingRequest(event)
    }

    if (isReportableError(error)) {
      capturePosthogException(error, {
        distinctId: resolveDistinctId(event),
        properties: {
          path: event && toReportedPath(event.path),
          method: event?.method,
          status_code: getErrorStatusCode(error)
        }
      })
    }

    await Promise.all([flushPosthog(), flushPosthogLogs()])
  }

  forwardConsoleToPosthogLogs(getCurrentRequestAttributes)

  nitroApp.hooks.hook('request', (event) => {
    if (isLoggedRequestPath(event.path)) {
      requestStartTimes.set(event, performance.now())
      startRequestMetrics(event)
    }
  })

  // An error response never reaches afterResponse: Nitro's error handler sends it and h3 stops
  // there. Nothing awaits this hook either, so waitUntil holds the Vercel instance open until the
  // flush is done. Off Vercel it does nothing and the flush simply runs.
  nitroApp.hooks.hook('error', (error, { event }) => {
    waitUntil(reportError(error, event))
  })

  // Nitro awaits this hook, which holds a serverless instance open long enough for the events
  // captured during the request to reach PostHog before it freezes.
  nitroApp.hooks.hook('afterResponse', async (event) => {
    logPendingRequest(event)
    await Promise.all([flushPosthog(), flushPosthogLogs()])
  })

  nitroApp.hooks.hook('close', async () => {
    await Promise.all([shutdownPosthog(), shutdownPosthogLogs()])
  })
})

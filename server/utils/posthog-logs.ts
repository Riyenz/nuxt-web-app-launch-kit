import { format } from 'node:util'
import { SeverityNumber, type Attributes, type Logger } from '@opentelemetry/api'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { getRequestHeader, type H3Event } from 'h3'
import { resolveRuntimeConfig } from './posthog'
import { toReportedPath, toReportedText } from './reported-path'
import { getRequestMetricAttributes } from './request-metrics'

// A flush runs after the response is sent but holds the serverless instance open, so a slow
// PostHog costs at most this long per request.
const EXPORT_TIMEOUT_MS = 2500

// The tracing headers come from the browser, so a caller can send anything. Long enough for a
// session id or a user id, short enough that a forged one stays a small log line.
const MAX_TRACING_HEADER_LENGTH = 200

const LOGGED_PATH_PREFIXES = ['/api/']
// Nuxt modules serve their own endpoints under `/api/_`, such as the icon bundle a server render
// fetches from itself on every page.
const MODULE_PATH_PREFIX = '/api/_'

let provider: LoggerProvider | null = null
let logger: Logger | null = null
let isLoggerResolved = false
let isConsoleForwarded = false
// True while a console call is being turned into a log record, or while the logger reports its
// own failure. A console call made in that window prints but is not sent, so a failed export
// cannot feed itself.
let isForwardingConsole = false

/** `Acme Billing` reports as `acme-billing`, the shape OpenTelemetry service names take. */
export function toServiceName(appName: string): string {
  return appName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app'
}

export function getPosthogLogger(): Logger | null {
  if (isLoggerResolved) {
    return logger
  }

  isLoggerResolved = true

  const config = resolveRuntimeConfig()
  const posthogKey = config?.public.posthogKey

  // Same rule as getPosthogClient(): no key, or a dev run, means no logs.
  if (!config || !posthogKey || import.meta.dev) {
    return logger
  }

  const serviceName = toServiceName(config.public.appName)

  provider = new LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': serviceName,
      'deployment.environment.name': process.env.VERCEL_ENV || 'local'
    }),
    logRecordLimits: { attributeValueLengthLimit: 8192 },
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          // Appended, not resolved, so a proxy mounted on a path (`https://example.com/ingest`) keeps it.
          url: `${config.public.posthogHost.replace(/\/+$/, '')}/i/v1/logs`,
          headers: { Authorization: `Bearer ${posthogKey}` },
          timeoutMillis: EXPORT_TIMEOUT_MS
        }),
        exportTimeoutMillis: EXPORT_TIMEOUT_MS
      })
    ]
  })
  logger = provider.getLogger(serviceName)

  return logger
}

export function isLoggedRequestPath(path: string): boolean {
  return LOGGED_PATH_PREFIXES.some(prefix => path.startsWith(prefix)) && !path.startsWith(MODULE_PATH_PREFIX)
}

export function getRequestSeverity(statusCode: number): { severityNumber: SeverityNumber, severityText: string } {
  if (statusCode >= 500) {
    return { severityNumber: SeverityNumber.ERROR, severityText: 'ERROR' }
  }

  if (statusCode >= 400) {
    return { severityNumber: SeverityNumber.WARN, severityText: 'WARN' }
  }

  return { severityNumber: SeverityNumber.INFO, severityText: 'INFO' }
}

function readTracingHeader(event: H3Event, name: string): string | undefined {
  return getRequestHeader(event, name)?.slice(0, MAX_TRACING_HEADER_LENGTH) || undefined
}

/**
 * posthog-js adds these headers to the app's own API calls (tracing_headers in
 * app/plugins/posthog.client.ts). PostHog reads `sessionId` to put a "View recording" button on
 * the log and `posthogDistinctId` to put it on the person. The browser sets them, so they link a
 * log and nothing else: never read them for access.
 */
export function getRequestLogAttributes(event: H3Event): Attributes {
  const sessionId = readTracingHeader(event, 'x-posthog-session-id')
  const posthogDistinctId = readTracingHeader(event, 'x-posthog-distinct-id')

  return {
    'http.request.method': event.method,
    'url.path': toReportedPath(event.path),
    ...(sessionId && { sessionId }),
    ...(posthogDistinctId && { posthogDistinctId })
  }
}

/** One line per API request. Bodies never go in: they can carry passwords and personal data. */
export function logRequest(event: H3Event, durationMs: number) {
  const posthogLogger = getPosthogLogger()

  if (!posthogLogger) {
    return
  }

  const statusCode = event.node.res.statusCode

  try {
    posthogLogger.emit({
      ...getRequestSeverity(statusCode),
      body: `${event.method} ${toReportedPath(event.path)} ${statusCode} ${durationMs}ms`,
      attributes: {
        ...getRequestLogAttributes(event),
        'http.response.status_code': statusCode,
        'duration_ms': durationMs,
        ...getRequestMetricAttributes(event)
      }
    })
  } catch {
    // Best effort: the response is already sent.
  }
}

// Node prints its own warnings through console.error, so without this check a notice about a
// runtime feature reaches PostHog as a server error.
export function isNodeExperimentalWarning(text: string): boolean {
  return /^\(node:\d+\) ExperimentalWarning: /.test(text)
}

/**
 * Sends every console.error and console.warn to PostHog Logs as well, except Node's experimental
 * feature notices. The original output still prints, so Vercel's runtime logs keep it too.
 * `getContextAttributes` names the request the call happened in, when there is one.
 */
export function forwardConsoleToPosthogLogs(getContextAttributes: () => Attributes) {
  const posthogLogger = getPosthogLogger()

  if (!posthogLogger || isConsoleForwarded) {
    return
  }

  isConsoleForwarded = true

  const levels = [
    { method: 'error', severityNumber: SeverityNumber.ERROR, severityText: 'ERROR' },
    { method: 'warn', severityNumber: SeverityNumber.WARN, severityText: 'WARN' }
  ] as const

  for (const { method, severityNumber, severityText } of levels) {
    const write = console[method]

    console[method] = function writeAndForward(...args: unknown[]) {
      write.apply(console, args)

      if (isForwardingConsole) {
        return
      }

      isForwardingConsole = true

      try {
        const text = format(...args)

        if (isNodeExperimentalWarning(text)) {
          return
        }

        posthogLogger.emit({
          severityNumber,
          severityText,
          body: toReportedText(text),
          attributes: { ...getContextAttributes(), source: 'console' }
        })
      } catch {
        // Logging must never break the code that logged.
      } finally {
        isForwardingConsole = false
      }
    }
  }
}

function reportLoggerFailure(message: string, error: unknown) {
  isForwardingConsole = true

  try {
    console.error(message, error)
  } finally {
    isForwardingConsole = false
  }
}

export async function flushPosthogLogs() {
  if (!provider) {
    return
  }

  try {
    await provider.forceFlush()
  } catch (error) {
    reportLoggerFailure('[posthog] Failed to flush logs', error)
  }
}

export async function shutdownPosthogLogs() {
  if (!provider) {
    return
  }

  try {
    await provider.shutdown()
  } catch (error) {
    reportLoggerFailure('[posthog] Failed to shut down logs', error)
  }
}

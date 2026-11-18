import type { ServerResponse } from 'node:http'
import type { Attributes } from '@opentelemetry/api'
import type { H3Event } from 'h3'

interface RequestMetrics {
  responseBodySize: number
  stepDurationsMs: Record<string, number>
}

const metricsByEvent = new WeakMap<H3Event, RequestMetrics>()

function getChunkSize(chunk: unknown, encoding: unknown): number {
  if (typeof chunk === 'string') {
    return Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding as BufferEncoding : 'utf8')
  }

  if (chunk instanceof Uint8Array) {
    return chunk.byteLength
  }

  return 0
}

// Counts the bytes as they pass to the socket, after h3 has turned the handler's value into
// JSON, so no response is serialized twice. The arguments go through untouched; `end` can take
// a callback alone, which carries no bytes.
function countBytesThrough<T extends ServerResponse['write'] | ServerResponse['end']>(send: T, metrics: RequestMetrics): T {
  return function sendAndCount(this: ServerResponse, ...args: unknown[]) {
    if (typeof args[0] !== 'function') {
      metrics.responseBodySize += getChunkSize(args[0], args[1])
    }

    return Reflect.apply(send, this, args)
  } as T
}

export function startRequestMetrics(event: H3Event) {
  const metrics: RequestMetrics = { responseBodySize: 0, stepDurationsMs: {} }
  const response = event.node.res

  metricsByEvent.set(event, metrics)
  response.write = countBytesThrough(response.write, metrics)
  response.end = countBytesThrough(response.end, metrics)
}

/**
 * Times one named part of a slow route, so its log line can split the total: `timing.<name>_ms`.
 * The step runs whether or not the request is being measured.
 */
export async function timeRequestStep<T>(event: H3Event, name: string, run: () => Promise<T>): Promise<T> {
  const startedAt = performance.now()

  try {
    return await run()
  } finally {
    const metrics = metricsByEvent.get(event)

    if (metrics) {
      metrics.stepDurationsMs[name] = (metrics.stepDurationsMs[name] ?? 0) + performance.now() - startedAt
    }
  }
}

/**
 * The body size is only known once the response is sent; an error line is written before that,
 * so it carries the step timings alone.
 */
export function getRequestMetricAttributes(event: H3Event): Attributes {
  const metrics = metricsByEvent.get(event)

  if (!metrics) {
    return {}
  }

  const stepAttributes = Object.fromEntries(
    Object.entries(metrics.stepDurationsMs).map(([name, durationMs]) => [`timing.${name}_ms`, Math.round(durationMs)])
  )

  return {
    ...stepAttributes,
    ...(event.node.res.writableEnded && { 'http.response.body_size': metrics.responseBodySize })
  }
}

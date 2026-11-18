import type { H3Event } from 'h3'

export const API_CACHE_CONTROL = 'private, no-store'

export function applyApiCacheControl(event: H3Event) {
  // A handler that sent its own response has already written its headers, and Node throws
  // on a late header write. Nitro reports that throw as a 500 the caller never saw.
  if (event.handled) {
    return
  }

  setResponseHeader(event, 'Cache-Control', API_CACHE_CONTROL)
}

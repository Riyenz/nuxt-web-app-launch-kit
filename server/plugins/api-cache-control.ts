import { applyApiCacheControl } from '../utils/api-cache-control'

// API payloads carry account data, so no browser, CDN or proxy may keep a copy. Setting the
// header after the handler runs means an endpoint cannot weaken the policy by accident.
export default defineNitroPlugin((nitroApp) => {
  // Also set on the way in: a handler that sends its own response (a 204, a redirect) has
  // committed its headers before beforeResponse runs, so that response would carry no policy.
  nitroApp.hooks.hook('request', (event) => {
    if (event.path.startsWith('/api/')) {
      applyApiCacheControl(event)
    }
  })

  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (event.path.startsWith('/api/')) {
      applyApiCacheControl(event)
    }
  })
})

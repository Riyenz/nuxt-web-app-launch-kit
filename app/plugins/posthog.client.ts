import { useUser } from '@clerk/vue'
import posthog, { type PostHog } from 'posthog-js'

const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

// Replays and click events keep a screen's words only inside an element that carries this
// attribute. Signed-in screens show customer data, so a replay turns their words into asterisks
// and a click event drops the clicked element's text. A new screen is hidden until its root opts
// in, which a public page such as the landing page should do.
const PUBLIC_PAGE_ATTRIBUTE = 'data-public-page'

function isPublicPageElement(element: Element | null | undefined) {
  return Boolean(element?.closest(`[${PUBLIC_PAGE_ATTRIBUTE}]`))
}

function hideTextOutsidePublicPages(text: string, element?: HTMLElement | null) {
  if (isPublicPageElement(element)) {
    return text
  }

  return text.replace(/\S/g, '*')
}

function readCampaignParams(search: string) {
  const query = new URLSearchParams(search)

  return Object.fromEntries(
    CAMPAIGN_PARAMS
      .map(name => [name, query.get(name)])
      .filter(([, value]) => Boolean(value))
  )
}

// The server reports errors under the Clerk user id (server/plugins/posthog.ts), so the browser
// identifies by the same id and an error lands on the person's replay.
function identifyClerkUser(client: PostHog) {
  const { isLoaded, user } = useUser()

  watch([isLoaded, () => user.value?.id], function syncIdentity() {
    if (!isLoaded.value) {
      return
    }

    if (user.value) {
      client.identify(user.value.id, { email: user.value.primaryEmailAddress?.emailAddress })
    } else if (client._isIdentified()) {
      client.reset()
    }
  }, { immediate: true })
}

export default defineNuxtPlugin<{ posthog: PostHog | null }>((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const { posthogKey, posthogHost, posthogUiHost } = runtimeConfig.public
  const isLocalHostname = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

  // Analytics is production-only, so dev traffic never lands in the real dashboards.
  if (!posthogKey || import.meta.dev || isLocalHostname) {
    return {
      provide: {
        posthog: null
      }
    }
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    // Needed only when api_host is a reverse proxy, which serves ingestion only. Without it a
    // replay link points at the proxy and opens a 404.
    ...(posthogUiHost && { ui_host: posthogUiHost }),
    defaults: '2026-05-30',
    // PostHog's own pageview, not a manual capture from router.afterEach: the router fires twice
    // on a first load, so every landing would count as two.
    capture_pageview: 'history_change',
    capture_pageleave: true,
    person_profiles: 'identified_only',
    autocapture: true,
    // Starts hidden; page:finish below shows the text again once a public page has rendered.
    mask_all_text: true,
    disable_session_recording: false,
    capture_exceptions: true,
    // Adds the replay id and the distinct id as headers to the app's own /api calls, so every
    // server log line links to this recording and this person (server/utils/posthog-logs.ts).
    tracing_headers: [window.location.hostname],
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      maskTextFn: hideTextOutsidePublicPages
    }
  })

  nuxtApp.hook('page:finish', function showClickTextOnPublicPages() {
    const isPublicPage = Boolean(document.querySelector(`[${PUBLIC_PAGE_ATTRIBUTE}]`))

    posthog.set_config({ mask_all_text: !isPublicPage })
  })

  // posthog-js reads the campaign parameters off the URL when it finishes loading, which lands
  // after the first $pageview. The landing hit of a tagged link, the only event a visitor who
  // reads the page and leaves ever sends, would then carry no utm_* and the campaign would be
  // invisible in a report. Register them from the URL first so it carries them.
  const campaignParams = readCampaignParams(window.location.search)

  if (Object.keys(campaignParams).length > 0) {
    posthog.register(campaignParams)
  }

  // capture_exceptions handles window.onerror and unhandled rejections, but Vue swallows
  // component errors before they reach those.
  nuxtApp.hook('vue:error', (error) => {
    posthog.captureException(error)
  })

  identifyClerkUser(posthog)

  return {
    provide: {
      posthog
    }
  }
})

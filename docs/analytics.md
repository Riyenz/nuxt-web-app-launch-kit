# Analytics, error tracking and server logs

**Read this when**: you turn on PostHog, add a server-side event, or need to find out why an
error or a log line did or did not reach PostHog.

PostHog does four jobs here. The browser sends pageviews, autocaptured clicks, session replays
and browser errors. The server sends 5xx errors and one log line per API request. Every one of
them carries the Clerk user id, so an error, a log line and a replay of the same person link up.

## Turn it on

Set one key in Vercel's **Production** environment:

| Variable | Value |
|---|---|
| `NUXT_PUBLIC_POSTHOG_KEY` | The project API key (`phc_...`) from PostHog, Project settings |

Without the key, everything below is off. The app boots, and lint, typecheck and E2E pass.
Previews, CI and local builds have no key, so test traffic never lands in the real project.

PostHog is also off in `nuxt dev` and on `localhost`, `127.0.0.1` and `[::1]`, even with a key.
posthog-js drops traffic from Playwright on its own, because the browser reports
`navigator.webdriver`.

Session replay also needs **Record user sessions** turned on in PostHog's project settings.

## Use a reverse proxy

The browser sends to `https://us.i.posthog.com` by default. Ad blockers block that host, so a
proxy on your own domain catches more traffic. Set both variables:

| Variable | Value |
|---|---|
| `NUXT_PUBLIC_POSTHOG_HOST` | The proxy, for example `https://e.example.com` |
| `NUXT_PUBLIC_POSTHOG_UI_HOST` | `https://us.posthog.com`, or `https://eu.posthog.com` for an EU project |

The UI host keeps replay links pointing at PostHog instead of the proxy, which serves
ingestion only. An EU project without a proxy sets `NUXT_PUBLIC_POSTHOG_HOST` to
`https://eu.i.posthog.com` and needs no UI host. `nuxt.config.ts` adds the host to the
Content-Security-Policy at build time, so set it in Vercel before the deploy, not after.

## What the browser sends

`app/plugins/posthog.client.ts` starts posthog-js and provides it as `useNuxtApp().$posthog`,
which is `null` when PostHog is off.

- **Identity.** Once Clerk loads, the plugin calls `identify` with the Clerk user id and the
  primary email. Sign-out calls `reset`, so the next visitor gets a fresh anonymous id.
- **Campaigns.** `utm_*` parameters are registered from the URL before the first pageview, so
  the landing hit of a tagged link carries them.
- **Errors.** `capture_exceptions` reports uncaught errors and rejections. A `vue:error` hook
  adds the component errors Vue catches first.
- **Replays and click text.** Replays turn every word into asterisks, and click events drop
  the element's text, except inside an element with the `data-public-page` attribute. Put the
  attribute on the root of a public page, such as the landing page, to keep its text. Inputs
  are always masked.
- **Tracing headers.** The app's own `/api` calls carry `X-POSTHOG-SESSION-ID` and
  `X-POSTHOG-DISTINCT-ID`, which the server copies onto its log line.

## What the server sends

`server/plugins/posthog.ts` wires three things into Nitro. `server/utils/posthog.ts` holds the
`posthog-node` client.

- **5xx errors** go to PostHog error tracking with `path`, `method` and `status_code`. The
  distinct id is the Clerk user id from `event.context.auth()`, so the error lands on the same
  person as their replay. A signed-out request reports as `server` and creates no person. A 4xx
  is the API saying no, so it is never reported (`isReportableError`).
- **One log line per `/api` request** goes to PostHog Logs over OpenTelemetry: method, path,
  status, duration, response size, and the session and person from the tracing headers. Module
  endpoints under `/api/_` are skipped. Request bodies never go in.
- **Every `console.error` and `console.warn`** goes to PostHog Logs too, tagged with the request
  it ran in. `nitro.experimental.asyncContext` in `nuxt.config.ts` is what finds that request.

The log service name is the app name in lowercase with dashes, from
`runtimeConfig.public.appName` (`NUXT_PUBLIC_APP_NAME`).

A serverless instance freezes as soon as the response is sent. The `afterResponse` hook awaits
the flush, and the `error` hook hands it to `waitUntil` from `@vercel/functions`, which Nitro
does not await. Off Vercel, `waitUntil` does nothing and the flush runs anyway.

## Paths never carry a query string or a token

`server/utils/reported-path.ts` cleans every path and console line before it leaves the server.
It drops the query string, because filters and links can name people. When a route carries its
whole credential in the path, such as an invite link, add its prefix to `TOKEN_ROUTES`. The
report then keeps the route and shows `[token]` in place of the secret.

The browser sends full URLs, query string included. Keep secrets out of page URLs, or strip
them in a `before_send` hook in the plugin.

## Add a server event

1. Add the event name to `SERVER_EVENTS` in `server/utils/posthog.ts`, with one line on what it
   records. A name that is not in the registry is a type error.
2. Call it after the write commits, never before, or you report work that then failed:

   ```ts
   capturePosthogEvent({ distinctId: userId, event: 'project_created', properties: { project_id: project.id } })
   ```

`capturePosthogEvent` never throws and never blocks the response. The plugin flushes it after
the response is sent. Delete the `example_event` entry when you add the first real one.

## Not included yet

Slow-query logging (queries over 500 ms) and per-request query counts need a timing hook in
`app/lib/prisma.ts`. They are a follow-up.

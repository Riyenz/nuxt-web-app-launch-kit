# Feature flags

**Read this when**: you ship a feature turned off, roll it out to some people, or turn it off
without a deploy.

Flags live in PostHog. The code only asks "is this on for this person?" and falls back to a safe
default whenever PostHog has no answer.

## Add a flag

1. Add an entry to `FEATURE_FLAGS` in `shared/feature-flags.ts`: the key, `defaultValue: false`,
   and a `description` of what it gates. The default is what everyone gets when PostHog is not
   configured (CI, E2E, branch previews), blocked, down, or slow. A key that is not in this
   registry is a type error.
2. Read it.
   - In a component, `const isNewBilling = useFeatureFlag('new-billing')` returns a read-only
     boolean ref (`app/composables/useFeatureFlag.ts`). It starts at the default and flips when
     PostHog answers, so a render never waits.
   - On the server, call `await isFeatureEnabled('new-billing', { userId, email })`
     (`server/utils/feature-flags.ts`). `userId` is the Clerk user id. A cold check waits at
     most 250 ms. Answers are cached per person for a minute and refreshed in the background.
3. Create the flag in PostHog (**Feature flags**, **New**) with the same key before the code
   ships.

Delete the `example-flag` entry when you add the first real flag.

## Roll it out

Edit the flag's release conditions in PostHog. No deploy is needed.

1. Test accounts: one condition, `email` is one of your own addresses, 100%.
2. Some people: a condition at 10%, then raise it.
3. Everyone: one condition with no filters, 100%.

## Turn it off

Set the flag's rollout to 0% in PostHog. Browsers pick it up on the next page load, and the
server within about a minute. Switching the whole flag off works too. PostHog then sends no
answer for it, which the server cannot tell from a failed request, so a server keeps its last
answer for up to 10 minutes. If PostHog itself is the problem, set
`NUXT_PUBLIC_FEATURE_FLAGS=new-billing=false` in Vercel and redeploy.

## Delete it

Once a flag has sat at 100% for two weeks with nothing reported, remove the check and the old
code path, remove the entry from `shared/feature-flags.ts`, deploy, then delete the flag in
PostHog.

## Local runs and E2E

Every flag is on in a local run and on the `develop` deploy, so new work is visible before it
ships. Production and branch previews keep the defaults. Set
`NUXT_PUBLIC_IS_EVERY_FEATURE_FLAG_ON=false` to see a local run the way production does.

`NUXT_PUBLIC_FEATURE_FLAGS` forces values without PostHog. `new-billing` turns it on,
`new-billing=false` turns it off, and commas separate several. An override beats the
every-flag switch. Set it on the server process, for example
`NUXT_PUBLIC_FEATURE_FLAGS=new-billing pnpm test:e2e`. Playwright reuses a dev server that is
already running, so stop that one first.

The E2E server has no `VERCEL_ENV`, so it runs with every flag on. When the first flag gates
something a spec covers, set `NUXT_PUBLIC_IS_EVERY_FEATURE_FLAG_ON: 'false'` and the flags its
tests need in `webServer.env` in `playwright.config.ts`. That way a feature still behind a flag
keeps its E2E coverage and the rest of the suite sees production defaults.

## Environment

- `NUXT_PUBLIC_POSTHOG_KEY`: without it, every flag is its default or its override.
- `NUXT_PUBLIC_FEATURE_FLAGS`: the override above.
- `NUXT_PUBLIC_IS_EVERY_FEATURE_FLAG_ON`: the every-flag switch above.

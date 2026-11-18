# Transactional email

**Read this when**: you send an email from the server, add a template, or check a template in a
real inbox.

The app sends email through Resend. `server/utils/email.ts` holds the sender and the rule for
when email goes out. `shared/` holds the templates, and they import nothing from Nuxt, so
Storybook and scripts can render them too.

## Turn it on

Set these at runtime in Vercel's **Production** environment:

| Variable | Value |
|---|---|
| `NUXT_RESEND_API_KEY` | An API key from resend.com, API Keys |
| `NUXT_RESEND_FROM_ADDRESS` | The sender, for example `Acme <noreply@acme.com>`, on a domain Resend has verified |
| `NUXT_APP_URL` | The public URL of the deployment, for example `https://app.acme.com` |

The `NUXT_` names are read when the server starts, so the key never sits in the build output.

## When email goes out

`isEmailEnabled` sends only when all of these hold:

- The build is a production build (`NODE_ENV=production`).
- `NUXT_APP_URL` is set and is not `localhost`, `127.0.0.1` or `[::1]`. A production build
  served on your own machine (`nuxt preview`, `node .output/server/index.mjs`) still reports
  production, and this rule is what keeps it from emailing real people.
- `NUXT_RESEND_API_KEY` and `NUXT_RESEND_FROM_ADDRESS` are set.

Otherwise `sendEmail` drops the message and returns. It also never sends to a Clerk test
address (`+clerk_test@`), which is what the seeded and E2E accounts use.

## Send an email

```ts
const email = buildWelcomeEmail({ appName, appUrl, firstName })
await sendEmail({ to, subject: email.subject, html: email.html, text: email.text })
```

`sendEmail` never throws. If Resend refuses the message or the request fails, it logs the error
and returns, because the work that asked for the email is already saved. The log line reaches
PostHog Logs too, when PostHog is on.

## Add a template

1. Write a builder in `shared/<name>-email.ts` that returns `{ subject, html, text }`. Build the
   body with `renderEmailLayout` from `shared/email-layout.ts`. It inlines every style, escapes
   every value, adds the dark-mode overrides, and writes the plain-text twin.
2. Add a story beside `stories/welcome-email.stories.ts` and check it in `pnpm storybook`.
3. Add it to `TEMPLATES` in `scripts/send-test-email.ts`.

## Check a template in a real inbox

```bash
pnpm email:test you@example.com                       # every template
pnpm email:test you@example.com welcome --app-url https://app.acme.com
pnpm email:test --list
```

The script sends straight through Resend and skips the production-only rule on purpose. It
needs `NUXT_RESEND_API_KEY` and `NUXT_RESEND_FROM_ADDRESS` in `.env`. Point `--app-url` at a
public deployment, or every button in the inbox dead-ends on localhost. The address is a
required argument, so nothing leaves your machine unless you name it.

## Not wired yet

The welcome email is not sent on sign-up. The sign-up flow owns that call.

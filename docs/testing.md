# Testing

Two suites, split by what they need to run:

| Suite | Command | Needs | Runs in CI |
|---|---|---|---|
| Unit (Vitest) | `pnpm test:unit` | Nothing | On the develop → master PR |
| E2E (Playwright) | `pnpm test:e2e` | A database, Clerk keys, a seeded DB | On the develop → master PR, selected specs only |

Both are wrapped by `scripts/quiet.mjs`, so a passing run prints one line and a failing
one replays everything. Add `:verbose` to any command to see the full output regardless.

## Unit tests

Plain node-environment tests for pure logic — no Nuxt runtime, no database. They live in
`tests/unit/` and are configured by `vitest.config.ts`, which maps `~`/`@` to `app/` and
`~~`/`@@` to the repo root.

```bash
pnpm test:unit          # one line on success
pnpm test:unit:watch    # re-run on change
pnpm test:unit:verbose  # full reporter output
```

Anything that needs a browser, a session or a database belongs in the E2E suite instead.

## E2E tests

```bash
pnpm test:e2e:install   # once per machine: download the Chromium build
pnpm exec prisma migrate deploy && pnpm seed
pnpm test:e2e
pnpm test:e2e:ui        # Playwright's interactive runner
```

The suite runs against a dev server it starts itself (`webServer` in
`playwright.config.ts`), and against the production build in CI — the dev server's
on-demand compilation can't sustain concurrent projects without flaky timeouts.

### Sign-in happens once, not per test

This is the part worth understanding before adding a spec.

Signing in to Clerk on every test hammers the rate-limited development instance and
makes sign-in itself the flakiest thing in the suite. Instead, a dedicated `setup`
project (`tests/e2e/auth.setup.ts`) signs in **once per role**, saves the browser
storage state to `tests/e2e/.auth/<role>.json`, and every other project replays it:

```
setup ──▶ tests/e2e/.auth/owner.json ──▶ read-only project
                                     └─▶ login project
```

In a spec you never call Clerk. You call a wrapper from `tests/e2e/helpers/auth.ts`:

```ts
import { signInAsOwner } from './helpers/auth'

test('the dashboard renders', async ({ page }) => {
  await signInAsOwner(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
```

`signInAsOwner` restores the cookies, opens `/`, and waits for clerk-js to boot. That
last wait matters: the captured `__session` JWT expires about 60 seconds after capture,
and letting clerk-js re-issue it from the long-lived client cookie is what stops an
immediate `page.request` call from going out with an expired token and getting a 401.

**Adding a role.** Add its Clerk test email to `AUTH_ROLES` in `helpers/auth.ts`, then
write a `signInAsX` wrapper beside `signInAsOwner`. `auth.setup.ts` iterates `AUTH_ROLES`,
so the new role gets a captured session with no other change.

**Running a single spec.** Go through the config so the `setup` dependency still runs:

```bash
pnpm exec playwright test tests/e2e/login.spec.ts   # ✅ setup runs first
```

A bare `playwright test --project=read-only` skips setup and the helpers will tell you
there is no captured session.

### Specs are grouped by the data they touch

`playwright.config.ts` puts specs into projects. Each project runs with `workers: 1`, but
the projects run concurrently. **Two specs that read or write the same seeded row must be
in the same project**, or they will race.

When a new spec owns different data, add a group rather than widening an existing one.

### Cleaning up

`tests/e2e/helpers/test-data.ts` owns the seed constants and the cleanup. Specs that
create rows name them by convention (`e2e:` titles, `e2e+` emails) so
`deleteTestArtifacts()` can remove them without touching seeded data. Global setup runs
that cleanup before the suite, so a run that crashed mid-test doesn't poison the next one.

## Which E2E specs CI runs

The full suite is expensive, so `.github/workflows/e2e.yml` asks
`scripts/ci/select-e2e-tests.mjs` which specs the PR diff can actually affect:

- a file matching a **rule** → that rule's specs
- a file matching **FULL_SUITE_PATTERNS** (schema, `nuxt.config.ts`, the auth helpers, …) → everything
- a **runtime file no rule claims** → everything

That last fallback is the safety net: an incomplete rules table costs extra CI time, never
missing coverage. Files listed in `NO_E2E_COVERAGE_PATTERNS` (docs, CSS, Storybook) are
skipped without triggering it — keep that list honest, since a file listed there that
really does affect a spec turns a red build green.

When the diff selects nothing, the job exits after selection in about 20 seconds. The
selector's own behaviour is covered by `tests/unit/select-e2e-tests.test.ts`.

Try it against any diff locally:

```bash
node scripts/ci/select-e2e-tests.mjs --files app/pages/app/dashboard.vue
```

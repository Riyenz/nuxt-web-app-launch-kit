# Test Accounts

Accounts used for manual QA, `pnpm shot`, and the E2E suite.

| Role | Email | Password |
|------|-------|----------|
| Owner / Admin | admin+clerk_test@avit.dev | !taXfov-8sipgo-qeqrap |

These live in the Clerk **development** instance the `.env` keys point at. An address
containing `+clerk_test` is a Clerk *test* email: it never sends a real message and
accepts the fixed OTP `424242`, which is what lets `@clerk/testing` sign in without a
mailbox.

## Seed data

`prisma/seed.ts` creates three users with posts. Specs assert against these rather than
creating their own, so a read-only spec costs nothing to set up:

| Email | Name | Posts |
|---|---|---|
| alice@example.com | Alice Johnson | 2 (one published, one draft) |
| bob@example.com | Bob Smith | 1 published |
| charlie@example.com | Charlie Brown | none |

The constants are exported from `tests/e2e/helpers/test-data.ts` — import them instead of
retyping the strings, so a seed change breaks the build rather than the suite.

Rows a spec creates itself are named by convention (`e2e:` post titles, `e2e+` emails) so
`deleteTestArtifacts()` can clean them up without touching seeded data.

## Adding an account

1. Create the user in the Clerk dashboard with a `+clerk_test` address.
2. Add it to `AUTH_ROLES` in `tests/e2e/helpers/auth.ts` and write a `signInAsX` wrapper.
3. Add it to `ROLES` in `scripts/shot.mjs` so `pnpm shot --as <role>` works.
4. Add the row to the table above.

## Clerk keys outside Nuxt

This project stores Clerk keys under the Nuxt names, while Clerk's own Playwright helpers
expect `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`. The E2E global setup and `pnpm shot`
alias them for you. Driving a browser by hand needs it done manually:

```bash
set -a
source .env
set +a

export CLERK_PUBLISHABLE_KEY="${NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY}"
export CLERK_SECRET_KEY="${NUXT_CLERK_SECRET_KEY}"
```

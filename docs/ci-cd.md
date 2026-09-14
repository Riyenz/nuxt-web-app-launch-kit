# CI/CD

**Read this when**: You need to understand the continuous integration pipeline, troubleshoot CI failures, or modify the GitHub Actions workflows.

## GitHub Actions Workflows

The project uses GitHub Actions for continuous integration, database migrations, and PR database provisioning.

- `.github/workflows/ci.yml` runs lint and typecheck on every pull request, plus unit tests and a build on the release PR.
- `.github/workflows/e2e.yml` runs the Playwright specs the diff can affect, on the release PR only.
- `.github/workflows/db-migrate.yml` applies committed Prisma migrations after pushes to `develop` and `master`.
- `.github/workflows/pr-neon-branch.yml` provisions a Neon branch per PR targeting `develop`, applies Prisma migrations, and updates the Vercel preview `DATABASE_URL`.

### Triggers

The CI workflow runs on pull requests into `develop` or `master` — **not** on push. A
`develop -> master` PR would otherwise fire twice on the same commit, since its head
commit is also the develop tip. Runs are grouped per PR with `cancel-in-progress: true`,
so pushing again cancels the superseded run.

The E2E workflow runs on pull requests into `master` only, grouped per PR but **not** cancelled
in progress — the suite signs in against the shared Clerk development
instance and cleans up in `afterEach` hooks, and a canceled runner never reaches them.

The DB migrate workflow runs on:
- Pushes to `develop`
- Pushes to `master`
- Manual dispatch

The PR Neon workflow runs on pull request lifecycle events targeting `develop`:
- `opened`
- `reopened`
- `synchronize`
- `closed`

### CI Pipeline Steps

Every pull request:

1. **Lint**: ESLint over the whole repo
2. **Typecheck**: `nuxt typecheck` for `app/` and `server/`, then `tsc -p tsconfig.test.json` for `tests/`

Only on the release PR (`develop -> master`, gated on `github.base_ref == 'master'`):

3. **Unit tests**: `pnpm test:unit`
4. **Build**: the production build

Feature branches merge into `develop` many times a day and only need the first two. The
expensive gates run once, on the pull request where a regression would otherwise reach
production. Feature PRs still get a production build check from the Vercel preview
deployment.

Separately, **DB migrate** runs `prisma migrate deploy` against the develop or production
database after the branch receives a push.

### The E2E Workflow

The full Playwright suite is expensive, so `scripts/ci/select-e2e-tests.mjs` maps the PR
diff to the specs it can actually affect. When the diff selects nothing, the job ends
after selection in about 20 seconds — no build, no seed, no browsers.

It runs against a Postgres service container (not Neon), migrated and seeded in the job,
and against the production build rather than the dev server. `DB_POOL_MAX: '10'` opts out
of the single-connection default in `app/lib/db-adapter.ts`, which exists for local PGlite
and cannot tell the two `localhost` URLs apart.

There is deliberately **no `paths-ignore`**: the job is a required status check on
`master`, and a workflow that never triggers reports nothing — leaving a docs-only PR
pending forever with no way to merge it. The selector's early exit already makes those
runs cheap.

Full detail, including the rules table and its fallbacks, is in [Testing](testing.md).

### Important Notes

- **Package manager**: CI uses **pnpm** (same as local development)
  - Both local and CI use pnpm for consistency
- **Build**: only on the release PR; feature PRs rely on the Vercel preview deployment
- **Tests**: unit tests and selected E2E specs, both on the release PR
- **Required secrets**: `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NUXT_CLERK_SECRET_KEY` for the build and E2E jobs (`make setup-secrets` syncs them from `.env`)
- **Preview databases**: PR previews get an isolated Neon branch named `pr-<number>`
- **Develop database**: Pushes to `develop` run migrations using `DEV_DATABASE_URL`
- **Production database**: Pushes to `master` run migrations using `PROD_DATABASE_URL`
- **Fork PRs**: The Neon workflow skips forked PRs because GitHub does not expose repository secrets there

## Local Validation Before Push

Before pushing code, ensure it will pass CI by running:

```bash
# What every PR runs
make check

# What the release PR runs
make check-all
```

The `pre-commit` hook already runs `env:check`, `lint` and `typecheck` on every commit.

See [agent-workflow.md](agent-workflow.md) for the complete workflow.

## Troubleshooting CI Failures

### Lint failures
- Run `pnpm run lint` locally to see the same errors
- Fix lint errors according to [naming-conventions.md](naming-conventions.md)
- Auto-fix some issues: `pnpm exec eslint . --fix`

### Type check failures
- Run `pnpm run typecheck` locally
- Check for type errors in modified files
- Ensure Prisma Client is regenerated after schema changes
- A failure in `tests/` comes from the second pass (`tsconfig.test.json`), not from Nuxt

### E2E failures
- Download the `playwright-report` artifact from the job for traces
- Reproduce locally: seed the database, then `pnpm test:e2e`
- "No captured session" means the `setup` project didn't run — go through
  `playwright.config.ts`, not a bare `--project` filter
- Two specs racing usually means they touch the same seeded row from different projects;
  see the grouping rules in [Testing](testing.md)

## Workflow Configuration

The workflows are defined in `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `.github/workflows/db-migrate.yml`, and `.github/workflows/pr-neon-branch.yml`.

Key configuration:
- pnpm version is managed via the `packageManager` field
- CI installs dependencies, then runs lint and typecheck
- DB migration requires `DEV_DATABASE_URL` and `PROD_DATABASE_URL`
- PR Neon provisioning requires GitHub Actions secrets for Neon and Vercel

See [neon-database-branching.md](neon-database-branching.md) for the full PR database setup.

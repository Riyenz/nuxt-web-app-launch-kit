# Per-Environment Databases

**Read this when**: You need to understand how each worktree and each pull request gets its own database, or you need to set up the required secrets.

## Overview

Every isolated environment gets its own database, but they come from two different places:

| System | Trigger | Database | Script |
|---|---|---|---|
| Paseo worktrees | Worktree setup/teardown | Local PGlite server `pw-<worktree-slug>` | `.paseo/local-db.mjs` |
| GitHub Actions | PR opened/closed against `develop` | Neon branch `pr-<number>` | `scripts/ci/neon-pr-branch.mjs` |

**Local development does not use Neon.** Worktrees and your main checkout run a local PGlite Postgres; Neon is only involved in CI preview databases and deployed environments.

## How It Works

### Paseo Worktrees (local PGlite, no Neon)

`paseo.json` points Paseo at `.paseo/setup.sh`, which:

1. Recreates `.env` — copied from the source checkout if it has one, otherwise from `.env.example` (Paseo starts each worktree without gitignored files)
2. Runs `pnpm install`
3. Calls `.paseo/local-db.mjs setup`, which starts a detached `prisma dev` server named `pw-<worktree-slug>` — PGlite, Postgres compiled to WASM, so enums, `Json`, `Decimal`, and advisory locks behave like Neon
4. Rewrites `DATABASE_URL`, `DIRECT_URL`, and `SHADOW_DATABASE_URL` in `.env` to point at that server
5. Applies `prisma migrate deploy` and seeds the database

The script deliberately doesn't pin ports — a fixed port would collide with the next worktree — so `prisma dev` allocates its own and the script reads the real connection strings back out of `prisma dev ls`, rewriting `.env` on every run. Re-running `node ./.paseo/local-db.mjs setup` is safe, and is the recovery path when the server isn't running after a reboot.

Teardown (`.paseo/teardown.sh`) removes the server and its storage.

### CI PR Branches

The GitHub Actions workflow at `.github/workflows/pr-neon-branch.yml` runs on PRs targeting `develop`:

1. On open/reopen/sync, it creates or reuses a Neon branch `pr-<number>`
2. It runs `prisma migrate deploy` against that branch
3. It writes the resulting `DATABASE_URL` into the matching Vercel preview environment for the PR's git branch
4. On close, it deletes the Neon branch and removes the preview `DATABASE_URL`

Fork PRs are skipped because repository secrets are not exposed to them.

## Required Configuration

Local development needs no Neon configuration at all — PGlite ships with Prisma.

### GitHub Actions Secrets

Set these in GitHub at `Settings -> Secrets and variables -> Actions`:

| Secret | Description |
|---|---|
| `NEON_PROJECT_ID` | Neon project ID |
| `NEON_API_KEY` | Neon API key for branch management |
| `NEON_PARENT_BRANCH` | Optional parent branch to fork from; defaults to `development` |
| `DEV_DATABASE_URL` | Develop branch database connection string for migration deploys |
| `PROD_DATABASE_URL` | Production database connection string for migration deploys |
| `VERCEL_ORG_ID` | Vercel team/org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VERCEL_TOKEN` | Vercel token with environment-variable permissions |

## Operational Notes

- The shared Neon parent branch must already exist and have the expected schema baseline. Nothing creates it automatically now that worktrees are local-only.
- `prisma migrate deploy` is used in CI so previews stay aligned with committed migrations.
- Pushes to `develop` and `master` run `.github/workflows/db-migrate.yml` against `DEV_DATABASE_URL` and `PROD_DATABASE_URL`.
- Vercel preview env vars are keyed by the PR head branch name, not the PR number.
- Stale Neon branches can still accumulate if a workflow is interrupted; clean up orphaned `pr-*` branches in Neon periodically.

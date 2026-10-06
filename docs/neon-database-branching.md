# Per-Environment Databases

**Read this when**: You need to understand how each worktree and each preview deployment gets its own database, or you need to set up the required secrets.

## Overview

Every isolated environment gets its own database. A preview deployment creates its own, so there is no window in which a build can reach for the wrong one.

| System | Who creates the database | Branch name | Script |
|---|---|---|---|
| **Vercel preview** | The build itself, before anything reads `DATABASE_URL` | the git branch name, verbatim | `scripts/ci/vercel-build.mjs` |
| **Vercel production** (`master`) | Nobody — uses the hand-set production `DATABASE_URL` | `production` | — |
| **Vercel `develop`** | Nobody — uses the shared `development` branch | `development` | — |
| **Paseo worktree** | `.paseo/setup.sh` | local PGlite, no Neon | `.paseo/local-db.mjs` |
| **CI e2e** | A Postgres service container, no Neon | — | `.github/workflows/e2e.yml` |

**Local development does not use Neon.** Worktrees and your main checkout run a local PGlite Postgres.

## How a preview gets its database

`vercel.json` points the build at one script. That script runs, in order:

1. Read `VERCEL_ENV` and `VERCEL_GIT_COMMIT_REF`.
2. Production, or the `develop` branch, or no git ref: use the stored `DATABASE_URL` and skip to step 5.
3. Otherwise create or reuse a Neon branch named after the git branch, forked from `development`. Neon accepts a slash, so `feat/manager-role` is a valid branch name and both the build and the cleanup job derive it from the same git ref.
4. Put that branch's direct (unpooled) connection string in the environment.
5. Run `prisma generate`, then `scripts/ci/deploy-migrate.mjs`, then `nuxt build`.

Because one process does all five steps, the database always exists before the build that uses it. Environment does not survive between `&&` steps in a shell command, which is why they are spawned from a script rather than chained in `vercel.json`.

`deploy-migrate.mjs` wakes a cold Neon compute, then runs `prisma migrate deploy`, retrying connection failures and advisory-lock errors. Migrations for production, `develop`, and every preview all run here. Nothing else migrates a deployed database.

### How the live preview finds its database

`nuxt build` bakes the branch's connection string into `runtimeConfig.databaseUrl`, and `server/plugins/00-database-url.ts` copies it onto `process.env.DATABASE_URL` when Nitro starts. `app/lib/prisma.ts` builds its client on first use rather than on import, so the plugin always runs first.

**The baked value wins on purpose.** A Vercel Preview variable reaches the deployed function as well as the build, so a leftover branch-scoped `DATABASE_URL` — or a project-wide preview fallback somebody re-adds — would otherwise decide which database the live preview talks to. Only the build knows which branch it migrated.

`runtimeConfig.databaseUrl` comes from `PREVIEW_DATABASE_URL`, which the build sets **only** when it created a branch of its own. It is empty for production and for the `develop` preview, so both keep their stored variable, the plugin does nothing, and the production password never enters the build output or Vercel's build cache — which means a rotation still takes effect without a rebuild.

### Branch limit

The Neon Free plan allows **10 branches**. `production` and `development` are permanent, so there are **8 preview slots** — fewer if a workspace or hand-made database holds some. When they are all taken, the build **fails** and names the databases that hold them, split into previews and reserved ones. Nothing is deleted automatically to make room.

A git branch named `production`, `development`, or anything starting with `sw-` or `local-` is refused before any Neon call, so a build can never migrate a database this flow does not own. Merge or close a pull request to release a slot, then redeploy.

### Cleanup

`.github/workflows/preview-db.yml` releases a slot when a pull request into `develop` or `master` closes or merges. That is the only automatic deletion in the system, and it deletes exactly one database: the one named after that pull request's branch.

**There is no scheduled sweep.** Nothing deletes a database on a timer, and nothing deletes one to make room. A branch pushed without a pull request keeps its database until somebody removes it in the Neon console. When the slots run out the next build fails and names what is holding them, and a person decides what goes.

`production`, `development`, and any name starting with a reserved prefix — `sw-` for a workspace database, `local-` for a hand-made one — can never be created or deleted by this flow at all.

Fork pull requests are skipped because repository secrets are not exposed to them.

### Stale pull requests

A preview database is a copy taken at first push. Migrations that land on `development` later do reach it, because every later build of that branch runs `migrate deploy`. Data that was seeded onto the parent after the copy was taken does not. To refresh the data, delete that Neon branch in the console and push again.

## Paseo worktrees (local PGlite, no Neon)

`paseo.json` points Paseo at `.paseo/setup.sh`, which:

1. Recreates `.env` — copied from the source checkout if it has one, otherwise from `.env.example` (Paseo starts each worktree without gitignored files)
2. Runs `pnpm install`
3. Calls `.paseo/local-db.mjs setup`, which starts a detached `prisma dev` server named `pw-<worktree-slug>` — PGlite, Postgres compiled to WASM, so enums, `Json`, `Decimal`, and advisory locks behave like Neon
4. Rewrites `DATABASE_URL`, `DIRECT_URL`, and `SHADOW_DATABASE_URL` in `.env` to point at that server
5. Applies `prisma migrate deploy` and seeds the database

The script deliberately doesn't pin ports — a fixed port would collide with the next worktree — so `prisma dev` allocates its own and the script reads the real connection strings back out of `prisma dev ls`, rewriting `.env` on every run. Re-running `node ./.paseo/local-db.mjs setup` is safe, and is the recovery path when the server isn't running after a reboot.

Teardown (`.paseo/teardown.sh`) removes the server and its storage.

## Required Secrets & Environment Variables

### Vercel — Preview environment only

| Variable | Description |
|---|---|
| `NEON_PROJECT_ID` | The Neon project the build creates its branch in |
| `NEON_PREVIEW_API_KEY` | **Project-scoped** Neon API key. Not the account-wide key — a project-scoped key cannot reach any other Neon project |
| `NEON_PARENT_BRANCH` | Optional. Defaults to `development` |

There must be exactly **one** stored preview `DATABASE_URL`: scoped to the `develop` git branch and pointing at the shared `development` Neon branch. That is what the `develop` preview builds and runs against.

There must be **no project-wide preview `DATABASE_URL`** and no other branch-scoped one. A project-wide fallback is what let a build quietly migrate the shared database. A feature-branch build with no database of its own must fail loudly.

Even if one is re-added by mistake, a preview whose build created its own branch ignores it — the baked value wins. The rule still stands, because a `develop` build reads the stored variable directly.

Vercel **Production** keeps its own hand-set `DATABASE_URL`. Never overwrite it. The production build migrates that database; there is no separate GitHub migration job.

### GitHub Actions Secrets

| Secret | Description |
|---|---|
| `NEON_PROJECT_ID` | Same Neon project |
| `NEON_API_KEY` | Used by the cleanup workflow to delete preview branches |

### Local `.env`

`NEON_PROJECT_ID`, `NEON_API_KEY`, `NEON_PREVIEW_API_KEY`, and `NEON_PARENT_BRANCH`. `make setup-secrets` pushes the first two to GitHub Actions. The preview key and the parent branch name belong on Vercel, not in GitHub. Paseo worktrees run a local PGlite server and do not touch Neon at all.

## Neon Console Setup

1. Keep a branch named `development`. Every preview forks it, so whatever you have seeded there comes along in the copy.
2. `production` must never be the fork parent. Preview builds use the Clerk **development** instance keys, and a production fork would copy customer data.
3. The build names its parent explicitly, so it does not matter which branch Neon marks as the project default.

## Troubleshooting

### The build fails with "Neon has no free branch slot"

All 8 preview slots are taken. The error lists them. Merge or close a pull request, or delete one in the Neon console, then redeploy.

### A preview 500s on a column that exists in `prisma/schema.prisma`

Compare that preview branch's `information_schema.columns` against the schema before you suspect the code. A Neon branch is a point-in-time copy: `_prisma_migrations` came along in the copy, and `migrate deploy` reports "No pending migrations" when the copy was already current and no new migration has landed since.

### A preview has no seed data

The parent had none when the branch was created, or somebody changed which branch the build forks. Check `NEON_PARENT_BRANCH` in Vercel. Reseeding the parent never reaches a child that already exists.

### Production shows the wrong data

Something overwrote the Production `DATABASE_URL` in Vercel. Restore it by hand.

### "Parent branch not found"

`NEON_PARENT_BRANCH` does not match any branch in the Neon project. Check the Neon console.

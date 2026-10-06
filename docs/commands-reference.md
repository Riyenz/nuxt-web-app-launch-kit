# Commands Reference

**Read this when**: You need to run the dev server, build the project, run tests, execute scripts, or work with Prisma.

All project commands in one place.

## Important Notes

- Always use **pnpm** for all commands (`pnpm run <script>`)
- Both local development and CI/CD use pnpm (see [ci-cd.md](ci-cd.md))
- Before marking any code changes as complete, run `pnpm run lint` and `pnpm run typecheck` (see [agent-workflow.md](agent-workflow.md))

## Validation Commands

```bash
make check               # Run both lint and typecheck
pnpm run check:changed   # Fast inner loop: cached lint + only the affected TS projects
pnpm run lint            # Run ESLint
pnpm run lint:verbose    # Same, but always print the full output
pnpm run typecheck       # Type-check the app AND tests/
```

`lint`, `typecheck` and the test commands go through `scripts/quiet.mjs`: on success they
print one line (`✓ lint passed (3.6s)`), on failure they replay everything. Passing is the
common case, so this keeps a terminal — and an agent's context — readable. Every one of
them has a `:verbose` twin that skips the wrapper.

`typecheck` runs `nuxt typecheck` **and** `tsc -p tsconfig.test.json`. Nuxt's generated
project only covers `app/` and `server/`, so without the second pass a broken type in a
spec would not surface until the suite ran.

`check:changed` is for the inner loop, not the gate: it reads `git status`, type-checks only
the projects your working-tree changes belong to, and reuses ESLint's cache. Run the full
`pnpm run lint && pnpm run typecheck` before you commit — that is what CI runs.

To auto-fix lint issues: `pnpm exec eslint . --fix`.

## Development Commands

```bash
pnpm run dev             # Start development server
pnpm run build           # Build for production
pnpm run preview         # Preview production build
pnpm install             # Install dependencies
pnpm bootstrap           # Fresh checkout: install + decode .env + generate client
```

## Testing

```bash
pnpm test:unit           # Vitest unit tests (no database, no browser)
pnpm test:unit:watch     # Re-run on change
pnpm test:e2e            # Playwright end-to-end suite
pnpm test:e2e:ui         # Playwright's interactive runner
pnpm test:e2e:install    # Once per machine: download the Chromium build
```

See [Testing](testing.md) — especially the captured-session fixture, which is why specs
never sign in to Clerk themselves.

## Local Database (no Neon account)

```bash
pnpm db:local            # Start a local Postgres (PGlite), leave it running
pnpm db:local:setup      # Migrate, generate the client, seed it
pnpm dev:local           # Run the app against it
pnpm db:local:studio     # Prisma Studio pointed at it
```

See [Environment Setup → Running Without Neon](environment-setup.md#running-without-neon).

## Screenshots

```bash
pnpm shot dashboard              # Screenshot a screen as the owner
pnpm shot dashboard --responsive # Desktop and mobile in one run
pnpm shot --list                 # Every named screen and role
pnpm shot --stop                 # Stop the cached dev server
pnpm shot dashboard --relabel 'Alice Johnson=>Maria Santos'   # Swap text just before the shot
```

Prefer the `screenshot` subagent over calling this inline — see
[App Screenshots](screenshots.md).

## Cloud File Review

```bash
pnpm upload <file>       # Upload a file and print a public link
pnpm upload --prune      # Only delete the files older than 7 days
```

Uploads to a Vercel Blob store and prints a URL that previews inline on a phone — videos
stream, PDFs and images render, no download first. Needs `BLOB_READ_WRITE_TOKEN` in
`.env` and the `vercel` CLI. The links are public, so ask before uploading.

Every run first deletes anything in the store older than 7 days — Blob has no expiry of its
own, and a Hobby store's 1 GB cap fills up fast. A failed cleanup never blocks the upload.

## Environment Commands

```bash
pnpm setup:env           # Decode .env.example into .env
pnpm env:sync            # Re-encrypt .env.example from .env after adding a variable
pnpm env:check           # Warn about variables in .env that .env.example is missing
```

## Local Database (PGlite)

Local development runs Postgres via Prisma 7's bundled [PGlite](https://pglite.dev)
server — no Docker, no cloud account, no Neon.

```bash
make db-local           # Start the local PGlite server (keep this terminal running)
make db-local-setup     # Apply migrations, generate the client, and seed (first run)
make dev-local          # Start the dev server against the local database
make db-local-studio    # Open Prisma Studio against the local database
```

The `db:local` scripts inject a local `DATABASE_URL` / `DIRECT_URL` /
`SHADOW_DATABASE_URL` into each command, so `.env` is left untouched — nothing to
swap. `app/lib/db-adapter.ts` selects the node-postgres adapter for the local
server and the Neon adapter for `*.neon.tech` URLs, so deployed environments are
unaffected. Ports and instance name are configurable via `PGLITE_PORT` /
`PGLITE_DB_PORT` / `PGLITE_NAME`.

**Paseo worktrees get this automatically.** `.paseo/setup.sh` starts a detached
server named `pw-<worktree>` and points the worktree's `.env` at it, so plain
`pnpm run dev` uses it. See [Per-Environment Databases](neon-database-branching.md).

## Prisma Commands

```bash
pnpm exec prisma generate                        # Regenerate client after schema changes
pnpm exec prisma migrate dev --name <name>       # Create and apply migration
pnpm exec prisma migrate deploy                  # Apply migrations in production
pnpm exec prisma studio                          # Open Prisma Studio GUI
pnpm exec prisma migrate reset                   # Reset database (dev only)
```

These run against whatever `DATABASE_URL` is in `.env`. To target the local
PGlite server from your main checkout, prefix them with
`node scripts/pglite.mjs exec --`.

## Makefile Shortcuts

```bash
make dev                # Start development server
make dev-local          # Start dev server against the local PGlite database
make build              # Build the application
make lint               # Run ESLint
make typecheck          # Run TypeScript checks
make check              # Run both lint and typecheck
make clean              # Clean build artifacts
```

## Common Workflows

### After Code Changes
```bash
pnpm run lint && pnpm run typecheck
```

### After Installing Dependencies
```bash
pnpm install
pnpm run lint && pnpm run typecheck
```

### After Schema Changes
```bash
pnpm exec prisma generate
pnpm run typecheck
```

### Before Opening a PR
```bash
pnpm run lint && pnpm run typecheck && pnpm test:unit
```

The `pre-commit` hook already runs `env:check`, `lint` and `typecheck`. Unit tests are not
in the hook — they are a CI gate on the develop → master pull request.

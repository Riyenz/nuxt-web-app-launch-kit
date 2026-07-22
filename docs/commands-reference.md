# Commands Reference

**Read this when**: You need to run the dev server, build the project, run tests, execute scripts, or work with Prisma.

All project commands in one place.

## Important Notes

- Always use **pnpm** for all commands (`pnpm run <script>`)
- Both local development and CI/CD use pnpm (see [ci-cd.md](ci-cd.md))
- Before marking any code changes as complete, run `pnpm run lint` and `pnpm run typecheck` (see [agent-workflow.md](agent-workflow.md))

## Validation Commands

```bash
make check              # Run both lint and typecheck
pnpm run lint            # Run ESLint
pnpm run lint --fix      # Auto-fix lint issues
pnpm run typecheck       # Run TypeScript type checker
```

## Development Commands

```bash
pnpm run dev             # Start development server
pnpm run build           # Build for production
pnpm run preview         # Preview production build
pnpm install             # Install dependencies
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

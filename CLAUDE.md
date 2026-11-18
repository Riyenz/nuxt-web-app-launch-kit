# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **Nuxt 4 web application starter kit** featuring Nuxt UI for components, Clerk for authentication, and Prisma ORM with Neon PostgreSQL. The project uses pnpm as the package manager.

## Agent Workflow

**IMPORTANT**: When making code changes, follow the [Agent Workflow Guide](docs/agent-workflow.md) to ensure code quality. The workflow requires that **all code changes pass both `pnpm run lint` and `pnpm run typecheck` before being marked as complete**. Never introduce code with linting errors or type errors.

## Documentation Quick Reference

Read the appropriate documentation file based on your task:

- **[Tech Stack](docs/tech-stack.md)** - Understanding technologies, versions, and which libraries to use
- **[Commands Reference](docs/commands-reference.md)** - Running dev server, builds, tests, scripts, or Prisma commands
- **[Prisma Workflow](docs/prisma-workflow.md)** - Database schema, migrations, or Prisma Client usage
- **[Project Architecture](docs/project-architecture.md)** - Understanding project structure and file organization
- **[Naming Conventions](docs/naming-conventions.md)** - Writing code that follows project style (boolean prefixes, brace style, commas)
- **[Environment Setup](docs/environment-setup.md)** - Setting up environment variables, running without Neon, or sharing env values across checkouts
- **[Testing](docs/testing.md)** - Writing or running unit and E2E tests, and how the captured Clerk session fixture works
- **[Test Accounts](docs/test-accounts.md)** - Credentials and seed data for manual QA, screenshots and E2E
- **[App Screenshots](docs/screenshots.md)** - Screenshotting a change in the running app with `pnpm shot`
- **[Per-Environment Databases](docs/neon-database-branching.md)** - Local PGlite for worktrees, Neon branches for PR previews
- **[Analytics](docs/analytics.md), [Feature Flags](docs/feature-flags.md), [Email](docs/email.md)** - PostHog analytics, error tracking and server logs; flags with safe defaults; Resend email. All off without their keys
- **[CI/CD](docs/ci-cd.md)** - Understanding the CI pipeline or troubleshooting workflow failures

## Quick Start

```bash
# Install dependencies, decode .env, generate the Prisma client
pnpm bootstrap

# Or, on a fresh clone with no shared env yet
cp .env.example .env   # then edit in your Clerk keys
pnpm install

# Start the local PGlite database (leave running), then in a second terminal:
make db-local
make db-local-setup    # first run only: migrate, generate, seed

# Start development against the local database
make dev-local
```

`prisma generate` is deliberately **not** in `postinstall`: it needs `DATABASE_URL`, which
does not exist the first time `pnpm install` runs. Re-run it after schema changes.

No Neon account? `pnpm db:local` + `pnpm dev:local` runs the whole app against a local
Postgres — see [Environment Setup](docs/environment-setup.md#running-without-neon).

In a **Paseo worktree** all of the above already ran — `.paseo/setup.sh` provisions
the worktree's own PGlite server and points `.env` at it, so plain `pnpm run dev` works.

## Core Principles

1. **Package Manager**: Use pnpm for all local development commands
2. **Code Quality**: All changes must pass `pnpm run lint` and `pnpm run typecheck`
3. **Boolean Naming**: Always use `is` prefix (never `has`)
4. **Database Access**: Always import `prisma from '~/lib/prisma'` (singleton pattern)
5. **Prisma Client**: Regenerate with `pnpm exec prisma generate` after schema changes
6. **Tests**: Unit tests in `tests/unit/` (pure logic, no DB), E2E in `tests/e2e/`. Never sign in to Clerk from a spec — use the wrappers in `tests/e2e/helpers/auth.ts`, which replay a session captured once. See [Testing](docs/testing.md)

`pnpm run lint`, `pnpm run typecheck` and the test commands print one line when they pass
and replay everything when they fail. Add `:verbose` to any of them to see the full output.
`typecheck` covers `tests/` as well as the app.

## Showing a Change

**Delegate it.** Spawn the `screenshot` subagent (`.claude/agents/screenshot.md`, runs on
a fast model) instead of taking screenshots inline — the work is one deterministic
command, so it does not need the main model's reasoning. Give it the screen, the role and
the viewport in plain words; it returns the file paths and what each shot shows.

The subagent runs `pnpm shot` — never a hand-driven dev server, Clerk sign-in and click
path:

```bash
pnpm shot dashboard                # named screen as the owner
pnpm shot /app/dashboard --dark
pnpm shot dashboard --responsive   # desktop + mobile of one screen
pnpm shot landing dashboard        # two screens, one run
```

`pnpm shot --list` prints every named screen and role. The server and each role's Clerk
session are cached between calls, so a warm capture is a few seconds and a cold one pays
once for the server and one sign-in. Every run prints its own timings. Full reference:
[App Screenshots](docs/screenshots.md).

## Browser Testing

For automation that is not a screenshot and not an E2E spec, use **playwright-cli** (not
agent-browser), and record video evidence:

```bash
playwright-cli open https://localhost:3000
playwright-cli video-start video.webm
# ... perform test steps ...
playwright-cli video-stop
playwright-cli close
```

Credentials and seed data: [Test Accounts](docs/test-accounts.md).

Skill reference: `/Users/ivanotiong/.claude/skills/playwright-cli/SKILL.md`

## Reviewing Generated Assets

When you generate a reviewable artifact — a screenshot, an image, a video, a PDF —
**offer to upload it for phone review**: `pnpm upload <file>` returns a public URL that
previews inline on mobile. Ask before uploading, since the links are public.

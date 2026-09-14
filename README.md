# Nuxt Web App Launch Kit

A modern, production-ready starter kit for building web applications with Nuxt 4, featuring a complete authentication system, database management, and UI components out of the box.

## Features

- **Nuxt 4** — Latest Nuxt framework with full TypeScript support
- **Nuxt UI** — Beautiful, accessible UI components built on Tailwind CSS
- **Clerk** — Complete authentication with user management
- **Prisma ORM** — Type-safe database access, local PGlite Postgres, Neon in production
- **pnpm** — Fast, efficient package manager
- **ESLint & TypeScript** — Code quality and type safety enforced, tests included
- **Vitest & Playwright** — Unit tests, plus an E2E suite that signs in to Clerk once and replays the session
- **Local Postgres** — `pnpm dev:local` runs the whole app with no Neon account and no Docker
- **`pnpm shot`** — One command screenshots any screen of the running app in seconds
- **GitHub Actions** — CI with lint, typecheck, diff-selected E2E, and per-PR Neon database branches
- **Vercel** — Preview deployments with isolated databases per PR

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [pnpm](https://pnpm.io) v10+
- [Clerk](https://clerk.com) account (free tier)

No database account is needed to run locally — the database runs on your machine.
A [Neon](https://neon.tech) account is only required for deployed environments and
CI preview databases.

### Step 1 — Create a Clerk application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create an application
2. From **API Keys**, copy your **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the two required values:

```bash
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."   # from Clerk → API Keys
NUXT_CLERK_SECRET_KEY="sk_test_..."               # from Clerk → API Keys
```

Leave `DATABASE_URL` blank — the local database supplies its own.

### Step 3 — Install

```bash
make init   # installs deps and generates the Prisma client
```

### Step 4 — Start the local database

Prisma 7 bundles [PGlite](https://pglite.dev), a real Postgres compiled to WASM, so
there's no Docker and no cloud account. Leave this running in its own terminal:

```bash
make db-local
```

Then, in a second terminal, initialize it once:

```bash
make db-local-setup   # migrations, Prisma client, seed data
```

### Step 5 — Run

```bash
make dev-local   # dev server at http://localhost:3000, pointed at the local DB
make doctor      # optional: verify env vars and service connectivity
```

`make dev-local` injects the local `DATABASE_URL` per command, so `.env` stays
untouched — use plain `make dev` when you want the app to use the `DATABASE_URL`
in `.env` instead. `app/lib/db-adapter.ts` picks the node-postgres adapter for
local Postgres and the Neon adapter for `*.neon.tech` URLs, so deployed
environments are unaffected.

### Paseo worktrees

Every [Paseo](https://paseo.sh) worktree provisions its own isolated PGlite server
named `pw-<worktree>`, migrated and seeded, with `.env` pointed at it — so plain
`make dev` works with nothing to set up. See
[Per-Environment Databases](docs/neon-database-branching.md).

---

## CI/CD Setup (GitHub Actions + Vercel)

The project ships with GitHub Actions workflows that run quality checks, apply database migrations on `develop` and `master`, and create an isolated Neon database branch plus Vercel preview deployment for every PR targeting `develop`. This is optional for local development but required for the full workflow.

### Required GitHub Actions secrets

Set these at `GitHub → Settings → Secrets and variables → Actions`:

| Secret | Where to get it |
|---|---|
| `NEON_PROJECT_ID` | Neon Console → Project → Settings → General |
| `NEON_API_KEY` | Neon Console → Account → API Keys |
| `NEON_PARENT_BRANCH` | Name of your base branch (default: `development`) |
| `DEV_DATABASE_URL` | Neon connection string for the develop database |
| `PROD_DATABASE_URL` | Neon connection string for the production database |
| `VERCEL_ORG_ID` | Vercel → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General → Project ID |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |

### Sync secrets automatically

If you add the Neon and Vercel values to your local `.env`, you can push them all to GitHub in one command:

```bash
make setup-secrets   # requires gh CLI: https://cli.github.com
```

### Required Vercel environment variables

Set these at `Vercel → Project → Settings → Environment Variables`:

| Variable | Environments | Why |
|---|---|---|
| `DATABASE_URL` | Production, Preview | `vercel.json` runs `prisma generate` before `nuxt build`, and `prisma.config.ts` resolves `DATABASE_URL` eagerly — a build with none set fails with `PrismaConfigEnvError`. The PR workflow adds a per-branch Preview override on top of this baseline. |
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production, Preview | Required at runtime by Clerk |
| `NUXT_CLERK_SECRET_KEY` | Production, Preview | Required at runtime by Clerk |

### Neon parent branch

The PR workflow forks a new database branch from a shared `development` branch for each PR into `develop`. Create that branch in the Neon console before the first PR runs — local development no longer touches Neon, so nothing creates it automatically.

---

## Available Commands

### Development

```bash
make dev             # Start development server (http://localhost:3000)
make build           # Build for production
make preview         # Preview production build
make install         # Install/update dependencies
```

### Code Quality

```bash
make lint            # Run ESLint
make lint-fix        # Auto-fix lint issues
make typecheck       # Type-check the app and tests/
make check           # Run both lint and typecheck
make check-all       # Everything CI runs on a release PR (adds unit tests)
```

All code changes must pass `make check` before being committed — the `pre-commit` hook
runs it for you. These commands print a single line when they pass and replay the full
output when they fail; add `:verbose` to the underlying `pnpm` script to see everything.

### Testing

```bash
make test-unit           # Vitest unit tests (no database, no browser)
make test-e2e            # Playwright end-to-end suite
pnpm test:e2e:install    # Once per machine: download the Chromium build
pnpm test:e2e:ui         # Playwright's interactive runner
```

Specs never sign in to Clerk themselves. A `setup` project mints one session per role into
`tests/e2e/.auth/`, and every spec replays it — which is what keeps the suite off Clerk's
rate limit. See [Testing](docs/testing.md).

### Local Database (no Neon account)

```bash
make db-local            # Terminal 1: start a local Postgres (PGlite), leave running
make db-local-setup      # Terminal 2: migrate, generate the client, seed
make dev-local           # Terminal 2: run the app against it
make db-local-studio     # Prisma Studio pointed at it
```

Backed by Prisma 7's bundled PGlite — real Postgres compiled to WebAssembly, so enums,
JSON, Decimal and advisory locks behave like production. Your `.env` is never touched.

### Screenshots

```bash
pnpm shot dashboard               # Screenshot a screen as the owner
pnpm shot dashboard --responsive  # Desktop and mobile in one run
pnpm shot --list                  # Every named screen and role
pnpm shot --stop                  # Stop the cached dev server
```

The dev server and each Clerk session are cached between calls, so a warm capture takes
seconds. See [App Screenshots](docs/screenshots.md).

### Database (Prisma)

```bash
make prisma-generate     # Regenerate Prisma Client
make prisma-migrate      # Create and apply a migration (prompts for name)
make prisma-deploy       # Apply migrations in production
make prisma-studio       # Open Prisma Studio GUI
make prisma-reset        # Reset database (dev only — WARNING: deletes all data)
```

### Setup & Diagnostics

```bash
make init            # First-time setup (install deps + generate Prisma client)
pnpm bootstrap       # Same idea for a shared-env checkout (install + decode .env + generate)
make doctor          # Check environment variables and service connectivity
make setup-secrets   # Sync CI/CD variables from .env to GitHub Actions secrets
pnpm upload <file>   # Upload a file and print a public link for phone review
make clean           # Clean build artifacts
make help            # List all available commands
```

---

## Environment Variables

### Required (local dev)

| Variable | Description |
|---|---|
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (starts with `pk_`) |
| `NUXT_CLERK_SECRET_KEY` | Clerk secret key (starts with `sk_`) |
| `DATABASE_URL` | Postgres connection string. Blank for local dev — PGlite supplies its own |
| `DIRECT_URL` | Unpooled endpoint for Prisma Migrate; only needed with Neon's `-pooler` host |

### Optional (CI/CD PR preview databases)

| Variable | Default | Description |
|---|---|---|
| `NEON_PROJECT_ID` | — | Neon project ID for PR branching |
| `NEON_API_KEY` | — | Neon API key for branch management |
| `NEON_PARENT_BRANCH` | `development` | Branch to fork PR databases from |

### CI/CD only (set as GitHub Actions secrets, not in .env)

| Variable | Description |
|---|---|
| `DEV_DATABASE_URL` | Develop database connection string for migration deploys |
| `PROD_DATABASE_URL` | Production database connection string for migration deploys |
| `VERCEL_ORG_ID` | Vercel team/org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VERCEL_TOKEN` | Vercel token with env-variable permissions |

---

## Project Structure

```
.
├── app/
│   ├── components/        # Vue components
│   ├── layouts/           # Layout components
│   ├── lib/               # Shared utilities (Prisma singleton)
│   ├── middleware/        # Route middleware
│   └── pages/             # Page components (auto-routed)
├── docs/                  # Detailed documentation
├── prisma/
│   ├── migrations/        # Migration history
│   └── schema.prisma      # Database schema
├── scripts/
│   ├── ci/                # GitHub Actions scripts (incl. E2E spec selection)
│   ├── setup/             # One-time setup helpers
│   ├── pglite.mjs         # Local PGlite Postgres server + exec wrapper
│   ├── quiet.mjs          # Buffers command output; one line when it passes
│   └── shot.mjs           # `pnpm shot` — screenshot the running app
├── server/
│   ├── api/               # API route handlers
│   └── plugins/           # Server startup plugins (env validation)
├── tests/
│   ├── unit/              # Vitest — pure logic, no DB or browser
│   └── e2e/               # Playwright, with the captured-session auth fixture
├── .claude/agents/        # Subagent definitions (screenshot)
├── .github/workflows/     # CI/CD workflows
├── .paseo/                # Paseo worktree setup/teardown + per-worktree database
├── paseo.json             # Paseo worktree configuration
├── Makefile               # Developer commands
├── playwright.config.ts   # E2E projects and their data grouping
├── vitest.config.ts       # Unit test configuration
└── nuxt.config.ts         # Nuxt configuration
```

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Nuxt | 4.2.2 | Vue.js framework |
| Nuxt UI | 4.2.1 | UI component library |
| Clerk | 1.13.7+ | Authentication & user management |
| Prisma | 7.1.0 | Database ORM |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | — | Utility-first CSS (via Nuxt UI) |
| ESLint | 9.39.3 | Code linting |
| Vitest | 4.1.7 | Unit tests |
| Playwright | 1.59+ | End-to-end tests |
| pnpm | 10.6.0+ | Package manager |

---

## Documentation

| Doc | When to read |
|---|---|
| [Environment Setup](docs/environment-setup.md) | Env vars, running without Neon, sharing values across checkouts |
| [Commands Reference](docs/commands-reference.md) | All available commands |
| [Testing](docs/testing.md) | Unit and E2E tests, and the captured-session fixture |
| [Test Accounts](docs/test-accounts.md) | Credentials and seed data |
| [App Screenshots](docs/screenshots.md) | `pnpm shot` and the screenshot subagent |
| [Prisma Workflow](docs/prisma-workflow.md) | Database schema and migrations |
| [Project Architecture](docs/project-architecture.md) | File organization |
| [Naming Conventions](docs/naming-conventions.md) | Code style guidelines |
| [Neon Database Branching](docs/neon-database-branching.md) | Per-workspace and per-PR databases |
| [CI/CD](docs/ci-cd.md) | GitHub Actions workflows |
| [Agent Workflow](docs/agent-workflow.md) | AI-assisted development workflow |

---

## Troubleshooting

### App won't start

Run `make doctor` — it will identify missing or malformed environment variables with links to fix them.

### Database issues

```bash
make prisma-generate   # Regenerate Prisma Client after schema changes
make prisma-reset      # Reset database (dev only — WARNING: deletes all data)
```

### Authentication issues

- Verify both Clerk keys are set and match your Clerk application
- `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` must start with `pk_`
- `NUXT_CLERK_SECRET_KEY` must start with `sk_`

### CI failures

- Run `make check` locally before pushing — CI runs the same lint and typecheck
- See [CI/CD docs](docs/ci-cd.md) for troubleshooting specific failures

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and run `make check`
4. Commit and open a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

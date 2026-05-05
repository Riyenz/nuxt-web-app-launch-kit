# Nuxt Web App Launch Kit

A modern, production-ready starter kit for building web applications with Nuxt 4, featuring a complete authentication system, database management, and UI components out of the box.

## Features

- **Nuxt 4** — Latest Nuxt framework with full TypeScript support
- **Nuxt UI** — Beautiful, accessible UI components built on Tailwind CSS
- **Clerk** — Complete authentication with user management
- **Prisma ORM** — Type-safe database access with Neon PostgreSQL
- **pnpm** — Fast, efficient package manager
- **ESLint & TypeScript** — Code quality and type safety enforced
- **GitHub Actions** — CI with lint, typecheck, and per-PR Neon database branches
- **Vercel** — Preview deployments with isolated databases per PR

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [pnpm](https://pnpm.io) v10+
- [Clerk](https://clerk.com) account (free tier)
- [Neon](https://neon.tech) account (free tier)

### Step 1 — Create service accounts

You need two accounts before the app can run locally:

**Clerk** (authentication)
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create an application
2. From **API Keys**, copy your **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

**Neon** (database)
1. Go to [console.neon.tech](https://console.neon.tech) and create a project
2. From **Connection Details**, copy the **Connection string** (`postgresql://...`)

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the three required values:

```bash
# Database
DATABASE_URL="postgresql://..."        # from Neon → Connection Details

# Authentication
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."   # from Clerk → API Keys
NUXT_CLERK_SECRET_KEY="sk_test_..."               # from Clerk → API Keys
```

### Step 3 — Verify your setup

```bash
make doctor
```

This checks that all required environment variables are set and correctly formatted. Fix any errors it reports before continuing.

### Step 4 — Install and run

```bash
make init   # installs deps, generates Prisma client, runs migrations
make dev    # starts dev server at http://localhost:3000
```

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

### Neon parent branch

The PR workflow forks a new database branch from a shared `development` branch for each PR into `develop`. The Conductor workspace setup script will auto-create this branch on first run if it doesn't exist.

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
make typecheck       # Run TypeScript type checker
make check           # Run both lint and typecheck
```

All code changes must pass `make check` before being committed.

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
make init            # Full first-time setup (install + generate + migrate)
make doctor          # Check environment variables and service connectivity
make setup-secrets   # Sync CI/CD variables from .env to GitHub Actions secrets
make clean           # Clean build artifacts
make help            # List all available commands
```

---

## Environment Variables

### Required (local dev)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (starts with `pk_`) |
| `NUXT_CLERK_SECRET_KEY` | Clerk secret key (starts with `sk_`) |

### Optional (Conductor workspace isolation)

| Variable | Default | Description |
|---|---|---|
| `NEON_PROJECT_ID` | — | Neon project ID for workspace branching |
| `NEON_API_KEY` | — | Neon API key for branch management |
| `NEON_PARENT_BRANCH` | `development` | Branch to fork new workspaces from |

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
│   ├── ci/                # GitHub Actions scripts
│   ├── conductor/         # Conductor workspace scripts
│   └── setup/             # One-time setup helpers
├── server/
│   ├── api/               # API route handlers
│   └── plugins/           # Server startup plugins (env validation)
├── .github/workflows/     # CI/CD workflows
├── conductor.json          # Conductor workspace configuration
├── Makefile               # Developer commands
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
| ESLint | 9.39.2 | Code linting |
| pnpm | 10.6.0+ | Package manager |

---

## Documentation

| Doc | When to read |
|---|---|
| [Environment Setup](docs/environment-setup.md) | Detailed env var instructions |
| [Commands Reference](docs/commands-reference.md) | All available commands |
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

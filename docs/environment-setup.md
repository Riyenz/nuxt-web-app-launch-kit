# Environment Setup

**Read this when**: Setting up the project for the first time, configuring environment variables, or troubleshooting environment-related issues.

## Prerequisites

Before setting up, ensure you have:

- **Node.js v18+** — Install from [nodejs.org](https://nodejs.org)
- **pnpm v10+** — Install via `npm install -g pnpm` or [Corepack](https://pnpm.io/installation#using-corepack): `corepack enable && corepack prepare pnpm@latest --activate`
- **A Clerk account** — Sign up free at [clerk.com](https://clerk.com)

No database account is needed for local development — Prisma's bundled PGlite
server provides Postgres locally. A [Neon](https://neon.tech) account is only
required for deployed environments and CI preview databases.

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
cp .env.example .env
```

### 1. Database — `DATABASE_URL`

**For local development, leave this blank.** `make db-local` runs a local PGlite
Postgres and injects its own connection string into every command, so `.env`
never needs a database URL. In a Paseo worktree, `.paseo/setup.sh` writes the
worktree's own `DATABASE_URL`, `DIRECT_URL`, and `SHADOW_DATABASE_URL` for you —
re-run `node ./.paseo/local-db.mjs setup` if the server isn't running (after a
reboot, say), since its ports change between runs.

Set `DATABASE_URL` only when you want to point the app at **Neon PostgreSQL** (or
any other Postgres) instead:

```bash
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
```

**How to get your Neon connection string:**

1. Go to [console.neon.tech](https://console.neon.tech) and sign in
2. Click **"New Project"** (or select an existing project)
3. Choose a project name (e.g., `nuxt-launch-kit`) and your preferred region
4. Once the project is created, you'll see the **Connection Details** panel on the dashboard
5. Make sure **"Connection string"** is selected (not individual fields)
6. Copy the full connection string — it looks like:
   ```
   postgresql://neondb_owner:abc123xyz@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
7. Paste it as the `DATABASE_URL` value in your `.env` file

> **Tip**: You can always find your connection string by going to your project dashboard → **Connection Details** in the Neon console.

### 2. Clerk Authentication — `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `NUXT_CLERK_SECRET_KEY`

This project uses **Clerk** for authentication and user management.

```bash
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NUXT_CLERK_SECRET_KEY="sk_test_..."
```

**How to get your Clerk API keys:**

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and sign in
2. Click **"Create application"** (or select an existing one)
3. Give your application a name (e.g., `Nuxt Launch Kit`)
4. Choose your preferred sign-in methods (e.g., Email, Google, GitHub)
5. Click **"Create application"**
6. You'll be taken to the **Quick Start** page — select **"Nuxt"** as your framework
7. You'll see both keys displayed:
   - **Publishable key** (starts with `pk_test_`) → copy to `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_`) → copy to `NUXT_CLERK_SECRET_KEY`

> **Tip**: You can always find your keys later at **Dashboard → API Keys** in the left sidebar.

### Summary

| Variable | Required | Starts with | Where to get |
| --- | --- | --- | --- |
| `DATABASE_URL` | Only for non-local databases | `postgresql://` | [Neon Console](https://console.neon.tech) → Project → Connection Details |
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | `pk_test_` or `pk_live_` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `NUXT_CLERK_SECRET_KEY` | Yes | `sk_test_` or `sk_live_` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |

## Initial Setup Steps

1. **Clone the repository and enter the project directory**:
   ```bash
   git clone <repository-url>
   cd nuxt-web-app-launch-kit
   ```

2. **Set up environment variables** (follow the instructions above):
   ```bash
   cp .env.example .env
   # Edit .env with your Clerk keys
   ```

3. **Install dependencies and generate the Prisma client**:
   ```bash
   make init
   ```

4. **Start the local database** and leave this terminal running:
   ```bash
   make db-local
   ```

5. **Initialize the database** in a second terminal (first run only):
   ```bash
   make db-local-setup
   ```

6. **Start development server**:
   ```bash
   make dev-local
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

### In a Paseo worktree

Steps 2-5 already ran during worktree setup, so start with:

```bash
make dev     # the worktree's .env already points at its own database
```

## Environment Variable Best Practices

- **Never commit** `.env` file to version control
- **Always update** `.env.example` when adding new environment variables
- **Use NUXT_PUBLIC_** prefix for variables that need to be exposed to the client
- **Keep secret keys** (like `NUXT_CLERK_SECRET_KEY`) server-side only

## Troubleshooting

### Database connection errors
- Local development: make sure `make db-local` is running in another terminal
- Paseo worktree: re-run `node ./.paseo/local-db.mjs setup` — the PGlite server's ports change between runs, and `.env` is rewritten to match
- Neon: check that `DATABASE_URL` is a valid connection string and includes `sslmode=require`
- Run `pnpm exec prisma generate` to regenerate the client

### Clerk authentication errors
- Verify both Clerk keys are set correctly
- Check that keys match your Clerk application environment (development/production)
- Ensure `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Ensure `NUXT_CLERK_SECRET_KEY` starts with `sk_`

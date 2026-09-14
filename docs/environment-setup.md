# Environment Setup

**Read this when**: Setting up the project for the first time, configuring environment variables, or troubleshooting environment-related issues.

## Prerequisites

Before setting up, ensure you have:

- **Node.js v18+** — Install from [nodejs.org](https://nodejs.org)
- **pnpm v10+** — Install via `npm install -g pnpm` or [Corepack](https://pnpm.io/installation#using-corepack): `corepack enable && corepack prepare pnpm@latest --activate`
- **A Clerk account** — Sign up free at [clerk.com](https://clerk.com)
- **A Neon account** — Sign up free at [neon.tech](https://neon.tech). Optional for local
  work: `pnpm dev:local` runs against a local Postgres instead (see
  [Running Without Neon](#running-without-neon) below).

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
cp .env.example .env
```

### 1. Database — `DATABASE_URL`

This project uses **Neon PostgreSQL** as its database.

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
| `DATABASE_URL` | Yes | `postgresql://` | [Neon Console](https://console.neon.tech) → Project → Connection Details |
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
   # Edit .env with your Neon DATABASE_URL and Clerk keys
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Initialize database**:
   ```bash
   pnpm exec prisma generate
   pnpm exec prisma migrate dev
   ```

   `prisma generate` is deliberately **not** part of `postinstall`: it reads
   `DATABASE_URL`, which does not exist yet the first time `pnpm install` runs. Re-run it
   yourself after pulling schema changes.

5. **Start development server**:
   ```bash
   pnpm run dev
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

### One-Command Alternative

If you've already configured your `.env` file, you can run everything with:

```bash
make init    # installs deps, generates Prisma client, runs migrations
make dev     # starts the dev server
```

## Running Without Neon

`pnpm dev:local` runs the whole app against a local Postgres — no Neon account, no
Docker. It is backed by Prisma 7's bundled PGlite server (`prisma dev`), which is real
Postgres compiled to WebAssembly, so enums, JSON, Decimal, triggers and advisory locks
all behave the way they do in production.

```bash
pnpm db:local          # terminal 1: start the local database, leave it running
pnpm db:local:setup    # terminal 2: migrate, generate the client, seed
pnpm dev:local         # terminal 2: run the app against it
pnpm db:local:studio   # optional: Prisma Studio pointed at the local database
```

`scripts/pglite.mjs` injects `DATABASE_URL` / `DIRECT_URL` / `SHADOW_DATABASE_URL` into
the command it runs, so your committed `.env` is never touched — switching back to Neon
is just running `pnpm dev` again.

`app/lib/db-adapter.ts` is what makes this work: a `neon.tech` URL goes through Neon's
serverless driver, anything else through node-postgres. It also caps the local pool at one
connection, because `prisma dev` multiplexes every TCP connection onto a single PGlite
session and a real pool there corrupts concurrent queries. CI sets `DB_POOL_MAX` to opt
out against a real Postgres.

## Sharing Env Values Across Checkouts

Optional, and worth turning on once the project has real secrets and more than one
working copy (git worktrees, a second machine, a teammate).

The idea: commit `.env.example` as **encrypted** ciphertext via
[dotenvx](https://dotenvx.com), and decode it into a gitignored `.env` on each machine.
Everyone gets the same values without anyone pasting secrets into chat.

```bash
pnpm bootstrap    # pnpm install && pnpm setup:env && pnpm exec prisma generate
```

The order matters: `setup:env` needs the `dotenvx` binary from `install`, and
`prisma generate` needs the decoded `.env`.

**Turning it on the first time.** With real values in `.env`:

```bash
cp .env .env.example
pnpm exec dotenvx encrypt -f .env.example   # mints a keypair, writes .env.keys
```

Commit `.env.example`. Never commit `.env` or `.env.keys`. Each machine exports the
private key once (`DOTENV_PRIVATE_KEY_EXAMPLE`, value from `.env.keys`) in `~/.zshrc`.

**Adding or changing a secret.** Edit the real `.env`, then:

```bash
pnpm env:sync    # re-encrypts .env.example, reusing the existing keypair
```

Commit `.env.example`. The `pre-commit` hook runs `pnpm env:check`, which warns (without
blocking) when `.env` has a variable `.env.example` is missing.

**Rotating the keypair.** `pnpm exec dotenvx rotate -f .env.example` regenerates it and
writes the new key to `.env.keys`. Then update the export in each machine's `~/.zshrc`
**and rotate the underlying secrets at their providers** — a leaked key means the
committed ciphertext was decryptable, so the values themselves are compromised.

> Vercel is unaffected: it uses its own dashboard env and runs a vanilla build — no
> dotenvx, no private key.

Until you turn this on, `.env.example` is plain text and `pnpm setup:env` simply copies
it, so `pnpm bootstrap` works either way.

## Environment Variable Best Practices

- **Never commit** `.env` or `.env.keys` to version control
- **Always update** `.env.example` when adding new environment variables
- **Use NUXT_PUBLIC_** prefix for variables that need to be exposed to the client
- **Keep secret keys** (like `NUXT_CLERK_SECRET_KEY`) server-side only

## Troubleshooting

### Database connection errors
- Check that `DATABASE_URL` in `.env` is a valid Neon PostgreSQL connection string
- Ensure `sslmode=require` is included in the connection string
- Run `pnpm exec prisma generate` to regenerate the client

### Clerk authentication errors
- Verify both Clerk keys are set correctly
- Check that keys match your Clerk application environment (development/production)
- Ensure `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Ensure `NUXT_CLERK_SECRET_KEY` starts with `sk_`

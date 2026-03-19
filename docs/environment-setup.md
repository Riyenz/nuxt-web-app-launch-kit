# Environment Setup

**Read this when**: Setting up the project for the first time, configuring environment variables, or troubleshooting environment-related issues.

## Prerequisites

Before setting up, ensure you have:

- **Node.js v18+** — Install from [nodejs.org](https://nodejs.org)
- **pnpm v10+** — Install via `npm install -g pnpm` or [Corepack](https://pnpm.io/installation#using-corepack): `corepack enable && corepack prepare pnpm@latest --activate`
- **A Neon account** — Sign up free at [neon.tech](https://neon.tech)
- **A Clerk account** — Sign up free at [clerk.com](https://clerk.com)

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

## Environment Variable Best Practices

- **Never commit** `.env` file to version control
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

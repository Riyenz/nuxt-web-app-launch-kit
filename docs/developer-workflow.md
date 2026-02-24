# Developer Workflow

**Read this when**: Setting up the project for the first time or onboarding new developers.

## Prerequisites

Before starting, ensure you have:

1. **pnpm v10 or higher** - Install from [pnpm.io](https://pnpm.io)
2. **Node.js v18 or higher** - Install from [nodejs.org](https://nodejs.org)
3. **PostgreSQL Database** - Local installation or cloud database (Neon, Supabase, Railway, etc.)
4. **Clerk Account** - Sign up at [clerk.com](https://clerk.com) (free tier available)
5. **Git** - For cloning the repository

## Installation Guide

### Step 1: Install pnpm

**Using npm:**

```bash
npm install -g pnpm
```

**Using Corepack (recommended):**

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

**Verify installation:**

```bash
pnpm --version
```

### Step 2: Clone the Repository

```bash
git clone <repository-url>
cd nuxt-web-app-launch-kit
```

### Step 3: Set Up Environment Variables

Create a `.env` file in the project root and add:

```bash
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# Clerk Authentication
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NUXT_CLERK_SECRET_KEY="sk_test_..."
```

**Getting Clerk Keys:**

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application (or create one)
3. Go to "API Keys" section
4. Copy Publishable Key → `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
5. Copy Secret Key → `NUXT_CLERK_SECRET_KEY`

**Database Connection String:**

- **Local PostgreSQL**: `postgresql://username:password@localhost:5432/database_name?schema=public`
- **Cloud databases**: Get connection string from your provider's dashboard

### Step 4: Install Dependencies

```bash
pnpm install
```

### Step 5: Set Up Database

**Generate Prisma Client:**

```bash
pnpm exec prisma generate
```

**Run Database Migrations:**

```bash
pnpm exec prisma migrate dev
```

**Optional: Seed the Database:**

```bash
pnpm run seed
```

### Step 6: Start Development Server

```bash
pnpm run dev
```

Or using Make:

```bash
make dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Quick Setup (Using Make)

For a single-command setup:

```bash
make init
```

This will:

1. Create `.env` from `.env.example` (if it exists)
2. Install dependencies
3. Generate Prisma Client
4. Run database migrations

**Note**: Edit `.env` with your Clerk credentials and database URL before migrations can run successfully.

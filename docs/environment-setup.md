# Environment Setup

**Read this when**: Setting up the project for the first time, configuring environment variables, or troubleshooting environment-related issues.

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

### Database Configuration

```bash
DATABASE_URL="file:./dev.db"
```

- **Purpose**: SQLite database connection string
- **Default**: `file:./dev.db` (relative to `prisma/` directory)
- **Production**: Update to point to your production database

### Clerk Authentication

```bash
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NUXT_CLERK_SECRET_KEY="sk_test_..."
```

- **NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: Clerk public key (exposed to client)
- **NUXT_CLERK_SECRET_KEY**: Clerk secret key (server-only, keep private)
- **How to get**: Sign up at [clerk.com](https://clerk.com) and create an application

## Initial Setup Steps

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Initialize database**:
   ```bash
   bunx prisma generate
   bunx prisma migrate dev
   ```

4. **Start development server**:
   ```bash
   bun run dev
   ```

## Environment Variable Best Practices

- **Never commit** `.env` file to version control
- **Always update** `.env.example` when adding new environment variables
- **Use NUXT_PUBLIC_** prefix for variables that need to be exposed to the client
- **Keep secret keys** (like `NUXT_CLERK_SECRET_KEY`) server-side only

## Troubleshooting

### Database connection errors
- Check that `DATABASE_URL` in `.env` is correct
- Verify `prisma/dev.db` file exists
- Run `bunx prisma generate` to regenerate the client

### Clerk authentication errors
- Verify both Clerk keys are set correctly
- Check that keys match your Clerk application environment (development/production)
- Ensure `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Ensure `NUXT_CLERK_SECRET_KEY` starts with `sk_`

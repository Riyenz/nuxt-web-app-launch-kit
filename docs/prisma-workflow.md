# Prisma Database Workflow

**Read this when**: Working with the database schema, running migrations, accessing the database, or setting up Prisma Client.

## Overview

This project uses **Prisma 7** with the new `prisma.config.ts` configuration system. The Prisma Client is generated to `app/generated/prisma/` (not the default location).

## Common Commands

```bash
# Generate Prisma Client after schema changes
bunx prisma generate

# Create and apply migrations
bunx prisma migrate dev --name <migration_name>

# Apply migrations in production
bunx prisma migrate deploy

# Open Prisma Studio
bunx prisma studio

# Reset database (dev only)
bunx prisma migrate reset
```

## Important Workflow Rules

1. **After any `schema.prisma` changes**: Run `bunx prisma generate` to regenerate the client in `app/generated/prisma/`
2. **Configuration**: Managed in `prisma.config.ts` (Prisma 7 feature)
3. **Client location**: Generated to `app/generated/prisma/` (custom output path)

## Database Access in Code

Import the Prisma Client singleton:

```typescript
// Recommended: Use the singleton instance
import prisma from '~/lib/prisma'

// Alternative: Import the PrismaClient class
import { PrismaClient } from '~/app/generated/prisma'
```

The singleton pattern in `lib/prisma.ts` prevents multiple instances during hot reload.

## Schema Details

- **Provider**: SQLite (`datasource.provider = "sqlite"`)
- **Client output**: `../app/generated/prisma`
- **Database URL**: From `DATABASE_URL` environment variable
- **Example models**: `User`, `Post` with relations

## File Locations

- Schema: `prisma/schema.prisma`
- Configuration: `prisma.config.ts`
- Migrations: `prisma/migrations/`
- Database file: `prisma/dev.db` (development)
- Generated client: `app/generated/prisma/` (do not edit)
- Singleton instance: `lib/prisma.ts`

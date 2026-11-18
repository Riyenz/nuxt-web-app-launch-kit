# Prisma Database Workflow

**Read this when**: Working with the database schema, running migrations, accessing the database, or setting up Prisma Client.

## Overview

This project uses **Prisma 7** with the new `prisma.config.ts` configuration system. The Prisma Client is generated to `app/generated/prisma/` (not the default location).

## Common Commands

```bash
# Generate Prisma Client after schema changes
pnpm exec prisma generate

# Create a migration, split it into expand and contract, and apply it
pnpm db:migrate <migration_name>

# Check every migration master does not have yet (CI runs this on every pull request)
pnpm check:migrations

# Rehearse two production deploys on a throwaway Postgres (needs Docker)
pnpm db:rehearse

# Apply migrations in production
pnpm exec prisma migrate deploy

# Open Prisma Studio
pnpm exec prisma studio

# Reset database (dev only)
pnpm exec prisma migrate reset
```

## Important Workflow Rules

1. **After any `schema.prisma` changes**: Run `pnpm exec prisma generate` to regenerate the client in `app/generated/prisma/`
2. **Configuration**: Managed in `prisma.config.ts` (Prisma 7 feature)
3. **Client location**: Generated to `app/generated/prisma/` (custom output path)
4. **New migrations**: Use `pnpm db:migrate <name>`, not `prisma migrate dev --name`, so a removal lands in a contract migration

## Expand and contract

A deploy must not interrupt anyone who is using the app. While Vercel builds and migrates, the
release already in production keeps answering requests, on the new schema. A migration that drops
a column the live release still reads makes every request that touches it fail until the new
release goes live.

So every schema change ships in two parts, and `pnpm db:migrate` writes both:

- **Expand.** A normal migration folder. It only adds or loosens: new tables, columns, enum values
  and indexes, a column made optional, a backfill. The production build applies it as its last
  step, so the new release finds everything it needs and the old one loses nothing.
- **Contract.** A folder whose name ends in `_contract`. It removes what only the old release read:
  dropped columns, tables and enum values, `SET NOT NULL`, a dropped default. A production build
  applies it only once the release serving production contains it, which is the next deploy after
  this one. The build asks production at `/api/cron/contract-migrations` with `CRON_SECRET`. When
  production cannot answer, every contract migration waits. Local databases, previews and E2E
  apply both parts at once.

```bash
pnpm db:migrate <name>                                # create, split and apply
pnpm db:migrate --split prisma/migrations/<folder>   # split a migration made with prisma migrate dev
```

Without a terminal, as in an agent session, `prisma migrate dev` refuses a migration that loses
data. Write the SQL with `pnpm exec prisma migrate diff --from-migrations prisma/migrations
--to-schema prisma/schema.prisma --script` into `prisma/migrations/<timestamp>_<name>/migration.sql`,
then split it with `--split`.

When the contract drops a required column, the expand part also drops its `NOT NULL`, so the new
release can create rows until the column is gone.

Making an existing column required, or removing an enum value, needs rows fixed first: the new
release cannot read an empty required field or a value its enum lacks, and Prisma writes no
`UPDATE` for that. `pnpm db:migrate` leaves a `-- TODO` in the expand part and in the contract,
then stops before it applies anything. Write the `UPDATE` in the expand part, repeat it in the
contract (for rows the old release saved in between), then run `pnpm exec prisma migrate dev`.
For an enum, move the rows of every table that uses it. If the `UPDATE` reads a temporary table,
drop it at the end of the expand part and create it again in the contract: production runs the
contract in a later session, while a local database runs both in one. A new column that becomes
required needs a `@default`, because the old release never fills it.

Some changes fit neither part, and `pnpm db:migrate` refuses them with the fix:

| Change | Do this instead |
| --- | --- |
| Rename a column or table | Rename the field or model only, and keep the database name with `@map("oldName")` or `@@map("OldName")`. |
| Add a required column to a table that has rows | Give the field a `@default`. |
| Change a column's type | Add a new column, write both, backfill, then drop the old one in a contract. |
| Rename an enum value | Add the new value, move the rows, then drop the old value in a contract. |

`pnpm check:migrations` checks every migration that `origin/master` does not have yet (run
`git fetch origin master` first). CI runs it on every pull request, and the `pre-commit` hook runs
it when a commit touches `prisma/migrations/`. An expand migration must not remove anything
production reads. A contract migration must only remove what `schema.prisma` no longer has. A
statement the check flags wrongly passes with `-- deploy-safe: <why>` on the line above it.

Rolling production back by one release keeps every column, table and enum value the older release
reads, because the contract the newer release brought has not run yet. It does not undo what the
newer release saved: a row with an enum value the older release does not know still breaks it.

`pnpm db:rehearse` is a mock production release on a throwaway Postgres in Docker. Release A is
`origin/master`, release B is your working tree. It runs the real deploy script for two deploys,
and after each step both releases read every table with their own Prisma Client. It then runs the
same migrations the old way, all at once, to show what A would have hit. Run it before a release
that changes the schema. Empty tables cannot show a removed enum value. The check above covers
that.

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

- **Provider**: PostgreSQL (`datasource.provider = "postgresql"`) via Neon
- **Client output**: `../generated/prisma`
- **Database URL**: From `DATABASE_URL` environment variable (Neon connection string)
- **Example models**: `User`, `Post` with relations

## File Locations

- Schema: `prisma/schema.prisma`
- Configuration: `prisma.config.ts`
- Migrations: `prisma/migrations/`
- Generated client: `generated/prisma/` (do not edit)
- Singleton instance: `lib/prisma.ts`

# Project Architecture

**Read this when**: You need to understand the project structure, where to place files, or how different parts of the application are organized.

## Directory Structure

```
/Users/ivanotiong/Projects/nuxt-web-app-launch-kit/
├── app/                          # Main application code
│   ├── app.vue                   # Root Vue component
│   ├── app.config.ts             # App-level configuration
│   ├── pages/                    # File-based routing pages
│   ├── components/               # Vue components (auto-imported)
│   ├── assets/css/               # Global CSS styles
│   └── generated/prisma/         # Prisma Client output (generated, do not edit)
├── lib/                          # Shared utilities
│   └── prisma.ts                 # Prisma Client singleton instance
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Database schema definition
│   ├── migrations/               # Migration history
│   └── dev.db                    # SQLite database file (development)
├── public/                       # Static assets
├── docs/                         # Documentation files
├── nuxt.config.ts                # Nuxt configuration
└── prisma.config.ts              # Prisma configuration
```

## Key Configuration Files

### Nuxt Config (`nuxt.config.ts`)
- **Modules**: `@nuxt/eslint`, `@nuxt/ui`, `@prisma/nuxt`
- **DevTools**: Enabled
- **Route rules**: Homepage (`/`) is prerendered
- **ESLint stylistic rules**: No trailing commas (`commaDangle: 'never'`), 1TBS brace style

### App Config (`app/app.config.ts`)
- **UI Colors**:
  - Primary: green
  - Neutral: slate

### Prisma Schema (`prisma/schema.prisma`)
- **Provider**: SQLite (`datasource.provider = "sqlite"`)
- **Client output**: `../app/generated/prisma`
- **Database URL**: From `DATABASE_URL` environment variable
- **Example models**: `User`, `Post` with relations

## Import Aliases

Nuxt provides these auto-imports and aliases:
- `~/` - Root directory
- `@/` - Root directory (alternative)
- Components in `app/components/` are auto-imported
- Composables in `app/composables/` are auto-imported

## Database Access Pattern

Always use the singleton instance to prevent multiple Prisma Client instances:

```typescript
import prisma from '~/lib/prisma'
```

The singleton pattern in `lib/prisma.ts` handles hot reload and prevents connection issues.

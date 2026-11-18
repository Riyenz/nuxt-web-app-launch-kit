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
│   ├── layouts/                  # Layout components
│   ├── middleware/               # Route middleware
│   ├── plugins/posthog.client.ts # Browser analytics, replay and identity (docs/analytics.md)
│   ├── composables/useFeatureFlag.ts # Feature flag reads in components
│   ├── assets/css/               # Global CSS styles
│   ├── lib/                      # Shared utilities
│   │   └── prisma.ts             # Prisma Client singleton instance
│   └── generated/prisma/         # Prisma Client output (generated, do not edit)
├── server/                       # Server-side code
│   ├── api/                      # API endpoints (file-based routing)
│   │   └── *.get.ts              # GET endpoints (e.g., users.get.ts)
│   ├── plugins/posthog.ts        # 5xx errors and request logs to PostHog
│   └── utils/                    # PostHog client, flags, email (auto-imported)
├── shared/                       # Code for both app and server: flag registry, email templates
├── stories/                      # Storybook stories, including the email templates
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Database schema definition
│   ├── migrations/               # Migration history
│   ├── seed.ts                   # Database seed script
│   └── seed-integrity.ts         # Asserts the seed's own invariants
├── public/                       # Static assets
├── docs/                         # Documentation files
├── nuxt.config.ts                # Nuxt configuration
└── prisma.config.ts              # Prisma configuration
```

## Key Configuration Files

### Nuxt Config (`nuxt.config.ts`)

- **Modules**: `@nuxt/eslint`, `@nuxt/ui`, `@clerk/nuxt`
- **DevTools**: Enabled
- **Route rules**: Homepage (`/`) is prerendered
- **ESLint stylistic rules**: No trailing commas (`commaDangle: 'never'`), 1TBS brace style

### App Config (`app/app.config.ts`)

- **UI Colors**:
  - Primary: blue
  - Secondary: indigo
  - Neutral: slate

### Prisma Schema (`prisma/schema.prisma`)

- **Provider**: PostgreSQL with Neon adapter
- **Client output**: `../generated/prisma`
- **Database URL**: From `DATABASE_URL` environment variable
- **Example models**: `User`, `Post` with relations

## Import Aliases

Nuxt provides these auto-imports and aliases:

- `~/` - Root directory
- `@/` - Root directory (alternative)
- Components in `app/components/` are auto-imported
- Composables in `app/composables/` are auto-imported

## API Endpoints

API endpoints are created in `server/api/` using file-based routing:

- `users.get.ts` → `/api/users` (GET request)
- `users.post.ts` → `/api/users` (POST request)
- `users/[id].get.ts` → `/api/users/:id` (GET request)

Example endpoint:

```typescript
import { prisma } from "../../app/lib/prisma";

export default defineEventHandler(async () => {
  const users = await prisma.user.findMany({
    include: { posts: true },
  });
  return users;
});
```

## Database Access Pattern

Always use the singleton instance to prevent multiple Prisma Client instances:

```typescript
import { prisma } from "../../app/lib/prisma";
```

The singleton pattern in `app/lib/prisma.ts` handles hot reload and prevents connection issues. Use this import path in server-side code (API endpoints, server utilities).

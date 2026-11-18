# Tech Stack

**Read this when**: You need to understand what technologies are used in this project, their versions, or which libraries to use for specific features.

## Core Stack

- **Framework**: Nuxt 4 (`~4.4.8`), with `@nuxt/schema` declared alongside it
- **Node**: 22.13 or newer (`engines`), the version CI and Vercel run
- **UI Library**: Nuxt UI (with Tailwind CSS)
- **Authentication**: Clerk (@clerk/nuxt)
- **Database ORM**: Prisma with PostgreSQL (Neon adapter)
- **Analytics, error tracking, server logs, feature flags**: PostHog (`posthog-js`, `posthog-node`, OpenTelemetry logs)
- **Transactional email**: Resend
- **Package Manager**: pnpm
- **Linting**: ESLint with Nuxt ESLint module
- **Type Checking**: TypeScript with vue-tsc

### Why `@nuxt/schema` is a direct dependency

`@nuxt/ui` and `@clerk/nuxt` each depend on an exact `@nuxt/schema` of their own (4.3.1 at the
time of writing). `.npmrc` sets `shamefully-hoist=true`, so only one copy can sit in the
top-level `node_modules`, and pnpm was hoisting theirs instead of the one Nuxt ships with.
The module types Nuxt generates in `.nuxt/` then augment the wrong copy, and
`nuxt.config.ts` fails with `TS2349: This expression is not callable. Type
'DefineNuxtConfig' has no call signatures`.

A direct dependency always wins the top-level slot, so declaring `@nuxt/schema` pins it to
Nuxt's own version and keeps every config key type-checked. **Bump the two together** — move
`nuxt` without `@nuxt/schema` and the error comes back on the next install.

## When to Use Each Technology

### UI Components

Use **Nuxt UI** components for all UI elements. It's built on Tailwind CSS with the app-level color scheme configured as:

- Primary: blue
- Secondary: indigo
- Neutral: slate

### Authentication

Use **Clerk** for all authentication and user management features. Configuration requires environment variables for Clerk keys.

### Database Operations

Use **Prisma** ORM for all database operations. The project uses PostgreSQL with Neon adapter. Access Prisma client via the singleton instance in `app/lib/prisma.ts`.

### API Endpoints

Use **Nuxt server routes** in `server/api/` directory. File-based routing automatically creates endpoints:

- `*.get.ts` for GET requests
- `*.post.ts` for POST requests
- `[id].get.ts` for dynamic routes

### Styling

Use **Tailwind CSS** utility classes. Nuxt UI components are pre-styled and customizable through Tailwind.

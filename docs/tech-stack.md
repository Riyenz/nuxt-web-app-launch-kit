# Tech Stack

**Read this when**: You need to understand what technologies are used in this project, their versions, or which libraries to use for specific features.

## Core Stack

- **Framework**: Nuxt 3 (with Nuxt 4 compatibility)
- **UI Library**: Nuxt UI (with Tailwind CSS)
- **Authentication**: Clerk (@clerk/nuxt)
- **Database ORM**: Prisma with PostgreSQL (Neon adapter)
- **Package Manager**: Bun
- **Linting**: ESLint with Nuxt ESLint module
- **Type Checking**: TypeScript with vue-tsc

## When to Use Each Technology

### UI Components

Use **Nuxt UI** components for all UI elements. It's built on Tailwind CSS with the app-level color scheme configured as:

- Primary: green
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

# Tech Stack

**Read this when**: You need to understand what technologies are used in this project, their versions, or which libraries to use for specific features.

## Core Stack

- **Framework**: Nuxt 4.2.2
- **UI Library**: Nuxt UI 4.2.1 (with Tailwind CSS)
- **Authentication**: Clerk (@clerk/nuxt)
- **Database ORM**: Prisma 7 with SQLite
- **Package Manager**: Bun
- **Linting**: ESLint 9 with Nuxt ESLint module
- **Type Checking**: TypeScript 5.9.3 with vue-tsc

## When to Use Each Technology

### UI Components
Use **Nuxt UI** components for all UI elements. It's built on Tailwind CSS with the app-level color scheme configured as:
- Primary: green
- Neutral: slate

### Authentication
Use **Clerk** for all authentication and user management features. Configuration requires environment variables for Clerk keys.

### Database Operations
Use **Prisma** ORM for all database operations. The project uses SQLite as the database provider.

### Styling
Use **Tailwind CSS** utility classes. Nuxt UI components are pre-styled and customizable through Tailwind.

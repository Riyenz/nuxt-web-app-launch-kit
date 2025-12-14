# Nuxt Web App Launch Kit

A modern, production-ready starter kit for building web applications with Nuxt 4, featuring a complete authentication system, database management, and UI components out of the box.

## Features

- **Nuxt 4.2.2** - Latest Nuxt framework with full TypeScript support
- **Nuxt UI 4.2.1** - Beautiful, accessible UI components built on Tailwind CSS
- **Clerk Authentication** - Complete auth solution with user management
- **Prisma ORM** - Type-safe database access with SQLite
- **Bun Package Manager** - Fast, modern package manager
- **ESLint & TypeScript** - Code quality and type safety enforced
- **CI/CD Ready** - GitHub Actions workflow included

## Prerequisites

- [Bun](https://bun.sh) v1.0.0 or higher
- [Node.js](https://nodejs.org) v18 or higher (for compatibility)
- [Clerk Account](https://clerk.com) (free tier available)

## Quick Start

### One-Command Setup

```bash
make init
```

This single command will:

1. Create `.env` file from `.env.example` (if it doesn't exist)
2. Install all dependencies
3. Generate Prisma Client
4. Run database migrations

**Note**: The setup will pause if `.env` doesn't exist, prompting you to add your Clerk credentials from the [Clerk Dashboard](https://dashboard.clerk.com). After adding your keys, run `make init` again.

### Start Development

```bash
make dev
```

Your app will be available at [http://localhost:3000](http://localhost:3000)

### Manual Setup (Alternative)

If you prefer step-by-step setup:

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your Clerk credentials
# Get keys from: https://dashboard.clerk.com

# 3. Install dependencies
make install

# 4. Generate Prisma Client and run migrations
make prisma-generate
make prisma-migrate

# 5. Start development server
make dev
```

## Available Commands

### Development

```bash
make dev             # Start development server
make build           # Build for production
make preview         # Preview production build
make install         # Install/update dependencies
```

### Code Quality

```bash
make lint            # Run ESLint
make lint-fix        # Auto-fix lint issues
make typecheck       # Run TypeScript type checker
make check           # Run both lint and typecheck
```

**Important**: All code changes must pass `make check` (lint + typecheck) before being committed.

### Database (Prisma)

```bash
make prisma-generate     # Regenerate Prisma Client
make prisma-migrate      # Create and apply migration (prompts for name)
make prisma-deploy       # Apply migrations (production)
make prisma-studio       # Open Prisma Studio GUI
make prisma-reset        # Reset database (dev only - WARNING: deletes all data)
```

### Setup & Utility

```bash
make init            # Complete project setup (use after cloning)
make clean           # Clean build artifacts
make help            # Show all available make commands
```

## Project Structure

```
.
├── app/                   # Application source code
│   ├── components/        # Vue components
│   ├── layouts/          # Layout components
│   ├── pages/            # Page components (auto-routed)
│   └── middleware/       # Route middleware
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration history
├── lib/                  # Shared utilities
│   └── prisma.ts         # Prisma client singleton
├── docs/                 # Detailed documentation
├── nuxt.config.ts        # Nuxt configuration
└── package.json          # Dependencies and scripts
```

## Tech Stack

| Technology   | Version | Purpose                          |
| ------------ | ------- | -------------------------------- |
| Nuxt         | 4.2.2   | Vue.js framework                 |
| Nuxt UI      | 4.2.1   | UI component library             |
| Clerk        | 1.13.7+ | Authentication & user management |
| Prisma       | 7.1.0   | Database ORM                     |
| TypeScript   | 5.9.3   | Type safety                      |
| Tailwind CSS | -       | Utility-first CSS (via Nuxt UI)  |
| ESLint       | 9.39.2  | Code linting                     |
| Bun          | 1.0.0+  | Package manager & runtime        |

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Tech Stack](docs/tech-stack.md)** - Technology choices and when to use each
- **[Commands Reference](docs/commands-reference.md)** - All available commands and workflows
- **[Prisma Workflow](docs/prisma-workflow.md)** - Database schema, migrations, and best practices
- **[Project Architecture](docs/project-architecture.md)** - File organization and structure
- **[Naming Conventions](docs/naming-conventions.md)** - Code style and naming guidelines
- **[Environment Setup](docs/environment-setup.md)** - Environment variables and configuration
- **[CI/CD](docs/ci-cd.md)** - Continuous integration and deployment
- **[Agent Workflow](docs/agent-workflow.md)** - Development workflow for AI-assisted coding

## Code Quality Standards

This project enforces strict code quality standards:

1. **Boolean Naming**: Always use `is` prefix (never `has`)
2. **TypeScript**: All code must be type-safe
3. **ESLint**: Code must pass linting checks
4. **Brace Style**: Follow established conventions (see [Naming Conventions](docs/naming-conventions.md))
5. **Database Access**: Always use the Prisma singleton from `~/lib/prisma`

## Common Workflows

### After Cloning the Repository

```bash
# Run the initialization command
make init

# Edit .env with your Clerk credentials if needed
# Get keys from: https://dashboard.clerk.com

# Start development server
make dev
```

### Before Committing Code

```bash
make check
```

### After Updating Database Schema

```bash
make prisma-generate     # Regenerate Prisma Client
make prisma-migrate      # Create and apply migration (will prompt for name)
```

## Environment Variables

| Variable                            | Required | Description                       |
| ----------------------------------- | -------- | --------------------------------- |
| `DATABASE_URL`                      | Yes      | SQLite database connection string |
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes      | Clerk publishable key (public)    |
| `NUXT_CLERK_SECRET_KEY`             | Yes      | Clerk secret key (private)        |

## Troubleshooting

### Database Issues

```bash
# Regenerate Prisma Client
make prisma-generate

# Reset database (dev only - WARNING: deletes all data)
make prisma-reset
```

### Authentication Issues

- Verify Clerk keys in `.env` match your Clerk dashboard
- Ensure `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
- Ensure `NUXT_CLERK_SECRET_KEY` starts with `sk_`

### Type Errors

```bash
# Run type checker
make typecheck

# Rebuild Prisma types and recheck
make prisma-generate
make typecheck
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run code quality checks (`make check`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

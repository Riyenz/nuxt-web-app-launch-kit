# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **Nuxt 4 web application starter kit** featuring Nuxt UI for components, Clerk for authentication, and Prisma ORM for SQLite database management. The project uses Bun as the package manager.

## Agent Workflow

**IMPORTANT**: When making code changes, follow the [Agent Workflow Guide](docs/agent-workflow.md) to ensure code quality. The workflow requires that **all code changes pass both `bun run lint` and `bun run typecheck` before being marked as complete**. Never introduce code with linting errors or type errors.

## Documentation Quick Reference

Read the appropriate documentation file based on your task:

- **[Tech Stack](docs/tech-stack.md)** - Understanding technologies, versions, and which libraries to use
- **[Commands Reference](docs/commands-reference.md)** - Running dev server, builds, tests, scripts, or Prisma commands
- **[Prisma Workflow](docs/prisma-workflow.md)** - Database schema, migrations, or Prisma Client usage
- **[Project Architecture](docs/project-architecture.md)** - Understanding project structure and file organization
- **[Naming Conventions](docs/naming-conventions.md)** - Writing code that follows project style (boolean prefixes, brace style, commas)
- **[Environment Setup](docs/environment-setup.md)** - Setting up environment variables or initial project setup
- **[CI/CD](docs/ci-cd.md)** - Understanding the CI pipeline or troubleshooting workflow failures

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Initialize database
bunx prisma generate
bunx prisma migrate dev

# Start development
bun run dev
```

## Core Principles

1. **Package Manager**: Use Bun for all local development commands
2. **Code Quality**: All changes must pass `bun run lint` and `bun run typecheck`
3. **Boolean Naming**: Always use `is` prefix (never `has`)
4. **Database Access**: Always import `prisma from '~/lib/prisma'` (singleton pattern)
5. **Prisma Client**: Regenerate with `bunx prisma generate` after schema changes

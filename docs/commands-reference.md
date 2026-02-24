# Commands Reference

**Read this when**: You need to run the dev server, build the project, run tests, execute scripts, or work with Prisma.

All project commands in one place.

## Important Notes

- Always use **pnpm** for all commands (`pnpm run <script>`)
- Both local development and CI/CD use pnpm (see [ci-cd.md](ci-cd.md))
- Before marking any code changes as complete, run `pnpm run lint` and `pnpm run typecheck` (see [agent-workflow.md](agent-workflow.md))

## Validation Commands

```bash
make check              # Run both lint and typecheck
pnpm run lint            # Run ESLint
pnpm run lint --fix      # Auto-fix lint issues
pnpm run typecheck       # Run TypeScript type checker
```

## Development Commands

```bash
pnpm run dev             # Start development server
pnpm run build           # Build for production
pnpm run preview         # Preview production build
pnpm install             # Install dependencies
```

## Prisma Commands

```bash
pnpm exec prisma generate                        # Regenerate client after schema changes
pnpm exec prisma migrate dev --name <name>       # Create and apply migration
pnpm exec prisma migrate deploy                  # Apply migrations in production
pnpm exec prisma studio                          # Open Prisma Studio GUI
pnpm exec prisma migrate reset                   # Reset database (dev only)
```

## Makefile Shortcuts

```bash
make dev                # Start development server
make build              # Build the application
make lint               # Run ESLint
make typecheck          # Run TypeScript checks
make check              # Run both lint and typecheck
make clean              # Clean build artifacts
```

## Common Workflows

### After Code Changes
```bash
pnpm run lint && pnpm run typecheck
```

### After Installing Dependencies
```bash
pnpm install
pnpm run lint && pnpm run typecheck
```

### After Schema Changes
```bash
pnpm exec prisma generate
pnpm run typecheck
```

# Commands Reference

**Read this when**: You need to run the dev server, build the project, run tests, execute scripts, or work with Prisma.

All project commands in one place.

## Important Notes

- Always use **Bun** for all commands (`bun run <script>`)
- Both local development and CI/CD use Bun (see [ci-cd.md](ci-cd.md))
- Before marking any code changes as complete, run `bun run lint` and `bun run typecheck` (see [agent-workflow.md](agent-workflow.md))

## Validation Commands

```bash
make check              # Run both lint and typecheck
bun run lint            # Run ESLint
bun run lint --fix      # Auto-fix lint issues
bun run typecheck       # Run TypeScript type checker
```

## Development Commands

```bash
bun run dev             # Start development server
bun run build           # Build for production
bun run preview         # Preview production build
bun install             # Install dependencies
```

## Prisma Commands

```bash
bunx prisma generate                        # Regenerate client after schema changes
bunx prisma migrate dev --name <name>       # Create and apply migration
bunx prisma migrate deploy                  # Apply migrations in production
bunx prisma studio                          # Open Prisma Studio GUI
bunx prisma migrate reset                   # Reset database (dev only)
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
bun run lint && bun run typecheck
```

### After Installing Dependencies
```bash
bun install
bun run lint && bun run typecheck
```

### After Schema Changes
```bash
bunx prisma generate
bun run typecheck
```

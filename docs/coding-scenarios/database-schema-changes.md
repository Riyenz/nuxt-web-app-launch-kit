# Database Schema Changes

Step-by-step workflow for modifying the Prisma schema.

## Workflow

1. Edit `prisma/schema.prisma`
2. Regenerate client
3. Create migration
4. Update code using schema
5. Validate (lint + typecheck)
6. Test database operations
7. Mark complete

## Commands

See [Commands Reference](../commands-reference.md#prisma-commands) for Prisma commands.

## Tips

- Always regenerate client after schema changes
- Use descriptive migration names
- Test database operations thoroughly

# Adding Features

Step-by-step workflow for implementing new functionality.

## Workflow

1. Read relevant existing code
2. Plan implementation
3. Write code following conventions
4. Validate (lint + typecheck)
5. Verify feature works
6. Mark complete

## Common Feature Types

### API Endpoints

Create endpoints in `server/api/` using file-based routing:

```typescript
import { prisma } from "../../app/lib/prisma";

export default defineEventHandler(async (event) => {
  const data = await prisma.model.findMany();
  return data;
});
```

Access from pages using `useFetch`:

```vue
<script setup>
const { data, isPending, error } = await useFetch("/api/endpoint");
</script>
```

### Page Components

Create pages in `app/pages/` directory. Use layouts via `definePageMeta`:

```vue
<template>
  <div>Page content</div>
</template>

<script setup>
definePageMeta({
  layout: "app",
});
</script>
```

## Tips

- Follow similar features for consistency
- Keep focused on the requested feature
- Don't add extras beyond requirements
- Use Nuxt UI components for consistent styling

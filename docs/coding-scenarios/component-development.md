# Component Development

Step-by-step workflow for creating Nuxt components.

## Workflow

1. Read existing components for patterns
2. Create in `app/components/`
3. Follow Nuxt UI patterns
4. Validate (lint + typecheck)
5. Test rendering
6. Mark complete

## Fetching Data

Use `useFetch` composable to fetch data from API endpoints:

```vue
<template>
  <div v-if="isPending">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <div v-for="item in data" :key="item.id">
      {{ item.name }}
    </div>
  </div>
</template>

<script setup>
const { data, isPending, error } = await useFetch("/api/endpoint");
</script>
```

## Tips

- Components auto-import in Nuxt
- Use Nuxt UI components when available
- Follow existing component patterns for consistency
- Handle loading and error states when fetching data

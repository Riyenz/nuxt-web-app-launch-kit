# Naming Conventions

**Read this when**: You're writing new code and need to name variables, functions, or follow the project's code style.

## Boolean Variables

**IMPORTANT**: Always use the `is` prefix for boolean variables, never use `has`.

```typescript
// ✅ Correct
const isLoading = true;
const isAuthenticated = false;
const isVisible = ref(false);

// ❌ Incorrect
const hasLoading = true;
const hasAuthenticated = false;
const loading = true; // Missing prefix
```

## Functions

**IMPORTANT**: Always use function declarations instead of arrow functions.

```typescript
// ✅ Correct
function doSomething() {
  return "something";
}

// ❌ Incorrect
const doSomething = () => "something";
```

## Icons

**IMPORTANT**: Always use the `hugeicons:iconname` format for icon references, never use the `i-hugeicons-iconname` format.

```vue
<!-- ✅ Correct -->
<UButton icon="hugeicons:arrow-right" />
<UIcon name="hugeicons:database" />
:icon="'hugeicons:lock-password'"

<!-- ❌ Incorrect -->
<UButton icon="i-hugeicons-arrow-right" />
<UIcon name="i-hugeicons-database" />
:icon="'i-hugeicons-lock-password'"
```

See [agent-workflow.md](agent-workflow.md) for the complete validation workflow.

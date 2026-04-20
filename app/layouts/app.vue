<template>
  <div class="flex h-screen bg-default">
    <AppSidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <AppNavbar />
      <main class="flex-1 overflow-y-auto bg-muted">
        <slot />
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  middleware: ['auth']
})
</script>

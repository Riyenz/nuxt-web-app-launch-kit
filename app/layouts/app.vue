<template>
  <UMain>
    <slot />
  </UMain>
</template>

<script lang="ts" setup>
definePageMeta({
  middleware: ['auth']
})
</script>

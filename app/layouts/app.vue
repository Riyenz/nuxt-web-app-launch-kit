<template>
  <UContainer class="py-6">
    <slot />
  </UContainer>
</template>

<script lang="ts" setup>
definePageMeta({
  middleware: ['auth']
})
</script>

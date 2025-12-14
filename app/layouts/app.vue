<template>
  <div>
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { useAuth } from '@clerk/vue'

const { isSignedIn } = useAuth()

if (!isSignedIn.value) {
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    message: 'You are not authorized to access this page.'
  })
}
</script>

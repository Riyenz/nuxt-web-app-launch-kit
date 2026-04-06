import { useAuth } from '@clerk/vue'
import { createError, defineNuxtRouteMiddleware } from '#imports'

export default defineNuxtRouteMiddleware(() => {
  const { isSignedIn } = useAuth()

  if (!isSignedIn.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'You are not authorized to access this page.'
    })
  }
})

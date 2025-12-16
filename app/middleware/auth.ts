import { useAuth } from '@clerk/vue'

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

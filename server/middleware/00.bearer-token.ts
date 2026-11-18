/**
 * Vercel cron requests, and the production build asking for its contract migrations, carry
 * CRON_SECRET as an opaque Bearer value rather than a Clerk session token. Verify it here, then
 * remove the header and leave a server-only marker for the route: Clerk's global middleware would
 * otherwise read the secret as a malformed session token before the route could run.
 *
 * The number prefix is load-bearing: Nitro runs the middleware in this folder in file-name order,
 * ahead of the one @clerk/nuxt registers, and this check only works if it lands first.
 */
export default defineEventHandler(function authorizeCronRequest(event) {
  if (!event.path.startsWith('/api/cron/')) {
    return
  }

  const cronSecret = process.env.CRON_SECRET
  const authorization = getRequestHeader(event, 'authorization')

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  event.context.isCronAuthorized = true
  delete event.node.req.headers.authorization
})

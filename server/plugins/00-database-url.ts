/**
 * A preview build creates its own Neon branch and bakes that connection string into
 * runtimeConfig, so hand it to the process before the first request builds the Prisma client.
 *
 * The baked value wins on purpose. A Vercel Preview environment variable reaches the deployed
 * function as well as the build, so a leftover branch-scoped DATABASE_URL — or a project-wide
 * preview fallback somebody re-adds — would otherwise decide which database the live preview
 * talks to. Only the build knows which branch it migrated.
 *
 * runtimeConfig.databaseUrl is empty unless the build created a branch, so production and the
 * `develop` preview keep their stored variable and stay rotatable without a rebuild. The `00-`
 * prefix keeps this ahead of any other server plugin that might query on startup.
 */
export default defineNitroPlugin(() => {
  const { databaseUrl } = useRuntimeConfig()

  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl
  }
})

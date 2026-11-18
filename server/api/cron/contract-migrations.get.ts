/// The production build asks the deployment serving production which contract migrations it was
/// built with, and applies only those: this deployment no longer reads what they remove.
/// See scripts/ci/deploy-migrate.mjs and docs/prisma-workflow.md.
export default defineEventHandler(function listContractMigrations(event) {
  if (event.context.isCronAuthorized !== true) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return { contracts: useRuntimeConfig().contractMigrations }
})

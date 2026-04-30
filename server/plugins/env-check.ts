export default defineNitroPlugin(() => {
  const checks = [
    {
      key: 'DATABASE_URL',
      hint: 'Get from console.neon.tech → Project → Connection Details',
      validate: (v: string) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      validationHint: 'Must start with postgresql://'
    },
    {
      key: 'NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      hint: 'Get from dashboard.clerk.com → API Keys',
      validate: (v: string) => v.startsWith('pk_'),
      validationHint: 'Must start with pk_'
    },
    {
      key: 'NUXT_CLERK_SECRET_KEY',
      hint: 'Get from dashboard.clerk.com → API Keys',
      validate: (v: string) => v.startsWith('sk_'),
      validationHint: 'Must start with sk_'
    }
  ]

  const errors: string[] = []

  for (const { key, hint, validate, validationHint } of checks) {
    const value = process.env[key]
    if (!value) {
      errors.push(`  Missing ${key}\n    → ${hint}`)
    } else if (!validate(value)) {
      errors.push(`  Invalid ${key}: ${validationHint}\n    → ${hint}`)
    }
  }

  if (errors.length === 0) return

  const lines = [
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '  Environment configuration errors:',
    ...errors,
    '',
    '  Copy .env.example to .env and fill in the values.',
    '  See docs/environment-setup.md for detailed instructions.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ''
  ]

  console.error(lines.join('\n'))
  process.exit(1)
})

/**
 * Send the email templates to a real inbox, straight from the builders the server sends. No dev
 * server and no database row needed.
 *
 *   pnpm email:test you@example.com                  # every template
 *   pnpm email:test you@example.com welcome          # one of them
 *   pnpm email:test you@example.com --list
 *   pnpm email:test you@example.com --app-url https://your-app.example
 *
 * The address is a required argument, so nothing leaves the machine unless it is named. It
 * bypasses the production-only rule in server/utils/email.ts on purpose: this is how you check a
 * template before it ships.
 *
 * Needs NUXT_RESEND_API_KEY and NUXT_RESEND_FROM_ADDRESS (a sender on a domain Resend has
 * verified). The links are absolute URLs built from NUXT_APP_URL, so point --app-url at a public
 * deployment or every button dead-ends on localhost.
 */
import process from 'node:process'
import 'dotenv/config'
import { Resend } from 'resend'
import { buildWelcomeEmail } from '../shared/welcome-email'

interface TemplateContext {
  appName: string
  appUrl: string
}

const TEMPLATES = {
  welcome: (context: TemplateContext) => buildWelcomeEmail({ ...context, firstName: 'Alice' })
}

type TemplateName = keyof typeof TEMPLATES

function isTemplateName(name: string): name is TemplateName {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, name)
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

async function main() {
  const args = process.argv.slice(2)
  const names = Object.keys(TEMPLATES)

  if (args.includes('--list')) {
    console.log(names.join('\n'))
    return
  }

  const to = args[0]

  if (!to || to.startsWith('--')) {
    console.error('Give the address to send to, e.g. pnpm email:test you@example.com')
    process.exit(1)
  }

  const appUrl = readOption(args, 'app-url') || process.env.NUXT_APP_URL || 'http://localhost:3000'
  const appName = process.env.NUXT_PUBLIC_APP_NAME || 'Launch Kit'
  const picked = args.slice(1).filter(arg => !arg.startsWith('--') && arg !== appUrl)
  const chosen = picked.length > 0 ? picked : names
  const unknown = chosen.filter(name => !isTemplateName(name))

  if (unknown.length > 0) {
    console.error(`Unknown template: ${unknown.join(', ')}\nKnown: ${names.join(', ')}`)
    process.exit(1)
  }

  const apiKey = process.env.NUXT_RESEND_API_KEY
  const from = process.env.NUXT_RESEND_FROM_ADDRESS

  if (!apiKey || !from) {
    console.error('Set NUXT_RESEND_API_KEY and NUXT_RESEND_FROM_ADDRESS in .env first. See docs/email.md.')
    process.exit(1)
  }

  if (appUrl.includes('localhost')) {
    console.warn(`The app URL is ${appUrl}, so every button will not resolve in a real inbox.`)
    console.warn('Pass --app-url https://your-deployment to fix that.\n')
  }

  console.log(`To ${to}\n`)

  const resend = new Resend(apiKey)

  for (const name of chosen.filter(isTemplateName)) {
    const email = TEMPLATES[name]({ appName, appUrl })
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text
    })

    console.log(error
      ? `  FAILED ${name}: ${error.message}`
      : `  sent   ${name}  ${data?.id ?? ''}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

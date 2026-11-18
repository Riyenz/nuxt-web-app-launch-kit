import { Resend } from 'resend'

export interface AppEmail {
  to: string
  subject: string
  html: string
  /** Plain-text twin. Sent alongside the HTML, never instead of it. */
  text?: string
  replyTo?: string
}

export interface EmailSettings {
  nodeEnv: string | undefined
  appUrl: string
  apiKey: string
  fromAddress: string
}

const LOCAL_APP_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i

/**
 * Local development and tests must not send real email, even with a Resend key configured.
 * NODE_ENV alone is not enough: a production build served on this machine (`nuxt preview`,
 * `node .output/server/index.mjs`) reports "production" while the app URL points at localhost.
 */
export function isEmailEnabled(settings: EmailSettings): boolean {
  return settings.nodeEnv === 'production'
    && Boolean(settings.appUrl)
    && !LOCAL_APP_URL_PATTERN.test(settings.appUrl)
    && Boolean(settings.apiKey)
    && Boolean(settings.fromAddress)
}

/** Seeded and end-to-end accounts are Clerk test users (`+clerk_test@`); they never get mail. */
export function isTestAccountEmail(email: string): boolean {
  return /\+clerk_test@/i.test(email)
}

/**
 * Sends one transactional message without letting delivery decide whether the action that asked
 * for it succeeded: the work is already saved, so a Resend outage is logged and swallowed.
 */
export async function sendEmail(message: AppEmail): Promise<void> {
  const config = useRuntimeConfig()
  const settings: EmailSettings = {
    nodeEnv: process.env.NODE_ENV,
    appUrl: config.appUrl,
    apiKey: config.resendApiKey,
    fromAddress: config.resendFromAddress
  }

  if (!isEmailEnabled(settings) || isTestAccountEmail(message.to)) {
    return
  }

  try {
    // Resend reports a refusal in the payload rather than by throwing.
    const { error } = await new Resend(settings.apiKey).emails.send({
      from: settings.fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.text && { text: message.text }),
      ...(message.replyTo && { replyTo: message.replyTo })
    })

    if (error) {
      console.error(`[email] Failed to send "${message.subject}":`, error)
    }
  } catch (error) {
    console.error(`[email] Failed to send "${message.subject}":`, error)
  }
}

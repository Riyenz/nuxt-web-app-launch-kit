import { renderEmailLayout, type RenderedEmail } from './email-layout'

export interface WelcomeEmailInput {
  appName: string
  appUrl: string
  /** From Clerk, and empty when the person signed up without a name. */
  firstName: string | null
}

export interface WelcomeEmail extends RenderedEmail {
  subject: string
}

export function buildWelcomeEmail(input: WelcomeEmailInput): WelcomeEmail {
  const firstName = input.firstName?.trim()
  const dashboardUrl = new URL('/app/dashboard', input.appUrl).toString()

  return {
    subject: `Welcome to ${input.appName}`,
    ...renderEmailLayout({
      appName: input.appName,
      heading: firstName ? `Welcome, ${firstName}` : `Welcome to ${input.appName}`,
      preheader: 'Your account is ready.',
      intro: [
        `Thanks for signing up for ${input.appName}. Your account is ready.`,
        'Open your dashboard to get started.'
      ],
      ctaLabel: 'Open your dashboard',
      ctaUrl: dashboardUrl,
      footNote: `You got this email because this address was used to sign up for ${input.appName}.`
    })
  }
}

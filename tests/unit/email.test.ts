import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isEmailEnabled, isTestAccountEmail, sendEmail, type EmailSettings } from '~~/server/utils/email'
import { buildWelcomeEmail } from '~~/shared/welcome-email'

const send = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  }
}))

const LIVE: EmailSettings = {
  nodeEnv: 'production',
  appUrl: 'https://app.example.com',
  apiKey: 're_test_key',
  fromAddress: 'App <noreply@example.com>'
}

describe('isEmailEnabled', () => {
  it('is on for a production build with a public URL, a key and a sender', () => {
    expect(isEmailEnabled(LIVE)).toBe(true)
  })

  it('is off outside production', () => {
    expect(isEmailEnabled({ ...LIVE, nodeEnv: 'development' })).toBe(false)
    expect(isEmailEnabled({ ...LIVE, nodeEnv: 'test' })).toBe(false)
    expect(isEmailEnabled({ ...LIVE, nodeEnv: undefined })).toBe(false)
  })

  it('is off for a production build whose app URL is local or unset', () => {
    for (const appUrl of ['http://localhost:3000', 'http://127.0.0.1:4180/app', 'http://[::1]:3000', 'HTTP://LOCALHOST', '']) {
      expect(isEmailEnabled({ ...LIVE, appUrl })).toBe(false)
    }
  })

  it('stays on for a public host that only starts with "localhost"', () => {
    expect(isEmailEnabled({ ...LIVE, appUrl: 'https://localhost-tools.example.com' })).toBe(true)
  })

  it('is off without a key or a sender', () => {
    expect(isEmailEnabled({ ...LIVE, apiKey: '' })).toBe(false)
    expect(isEmailEnabled({ ...LIVE, fromAddress: '' })).toBe(false)
  })
})

describe('isTestAccountEmail', () => {
  it('matches Clerk test addresses only', () => {
    expect(isTestAccountEmail('admin+clerk_test@avit.dev')).toBe(true)
    expect(isTestAccountEmail('Admin+Clerk_Test@Example.com')).toBe(true)
    expect(isTestAccountEmail('alice@example.com')).toBe(false)
  })
})

describe('sendEmail', () => {
  const message = { to: 'alice@example.com', subject: 'Hello', html: '<p>Hello</p>', text: 'Hello' }

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('useRuntimeConfig', () => ({
      appUrl: LIVE.appUrl,
      resendApiKey: LIVE.apiKey,
      resendFromAddress: LIVE.fromAddress
    }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hands the message to Resend from the configured sender', async () => {
    send.mockResolvedValue({ data: { id: 'email_1' }, error: null })

    await sendEmail(message)

    expect(send).toHaveBeenCalledWith({ from: LIVE.fromAddress, ...message })
  })

  it('sends nothing to a Clerk test account', async () => {
    await sendEmail({ ...message, to: 'admin+clerk_test@avit.dev' })

    expect(send).not.toHaveBeenCalled()
  })

  it('sends nothing when email is off', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    await sendEmail(message)

    expect(send).not.toHaveBeenCalled()
  })

  it('logs a refusal and a thrown error, and resolves for the caller either way', async () => {
    send.mockResolvedValueOnce({ data: null, error: { message: 'domain not verified' } })
    send.mockRejectedValueOnce(new Error('network down'))

    await expect(sendEmail(message)).resolves.toBeUndefined()
    await expect(sendEmail(message)).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledTimes(2)
  })
})

describe('buildWelcomeEmail', () => {
  const app = { appName: 'Acme', appUrl: 'https://app.example.com' }

  it('greets by first name and links to the dashboard', () => {
    const email = buildWelcomeEmail({ ...app, firstName: ' Alice ' })

    expect(email.subject).toBe('Welcome to Acme')
    expect(email.text).toContain('Welcome, Alice')
    expect(email.html).toContain('href="https://app.example.com/app/dashboard"')
  })

  it('escapes a name that carries markup', () => {
    const email = buildWelcomeEmail({ ...app, firstName: '<img src=x onerror=alert(1)>' })

    expect(email.html).not.toContain('<img src=x')
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})

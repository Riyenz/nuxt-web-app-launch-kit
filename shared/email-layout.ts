export interface EmailDetail {
  label: string
  value: string
}

export interface EmailLayoutOptions {
  /** Shown as text at the top of the card. Mail clients strip web fonts, so it is not a logo. */
  appName: string
  heading: string
  /**
   * The line an inbox shows next to the subject. Without it the client grabs whatever text
   * comes first, which is the app name and tells the reader nothing.
   */
  preheader?: string
  /** Paragraphs above the detail table. Plain sentences, no markup. */
  intro: string[]
  details?: EmailDetail[]
  ctaLabel?: string
  ctaUrl?: string
  /** Small print under the button, e.g. why this address was written to. */
  footNote?: string
}

export interface RenderedEmail {
  html: string
  /** Same message as plain text, for a text-only client and for spam filters. */
  text: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Padding characters after the preview line, so the client stops there instead of pulling the
 * heading in after it and showing the same sentence twice in the inbox list.
 */
function renderPreheader(preheader: string | undefined): string {
  if (!preheader) {
    return ''
  }

  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}${'&#847;&zwnj;&nbsp;'.repeat(60)}</div>`
}

/**
 * One inline-styled shell for every transactional message. Email clients strip stylesheets, so
 * each rule is written on the element it applies to and the classes carry only the dark-mode
 * overrides. Kept free of Nuxt and Resend imports so Storybook and scripts can render it.
 */
export function renderEmailLayout(options: EmailLayoutOptions): RenderedEmail {
  const intro = options.intro
    .map(paragraph => `<p class="em-text" style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(paragraph)}</p>`)
    .join('')

  const details = options.details?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:4px 0 24px;border-collapse:collapse;">${
      options.details.map(detail => `
        <tr>
          <td class="em-label em-rule" style="padding:9px 0;font-size:13px;color:#64748b;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1f5f9;">${escapeHtml(detail.label)}</td>
          <td class="em-value em-rule" style="padding:9px 0 9px 16px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${escapeHtml(detail.value)}</td>
        </tr>`).join('')
    }</table>`
    : ''

  const cta = options.ctaLabel && options.ctaUrl
    ? `<p style="margin:0 0 20px;">
        <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;min-width:180px;padding:14px 24px;border-radius:10px;background-color:#2563eb;color:#ffffff;font-size:15px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;">${escapeHtml(options.ctaLabel)}</a>
      </p>`
    : ''

  const footNote = options.footNote
    ? `<p class="em-foot" style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">${escapeHtml(options.footNote)}</p>`
    : ''

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(options.heading)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .em-page { background-color: #0f172a !important; }
    .em-card { background-color: #1e293b !important; border-color: #334155 !important; }
    .em-heading, .em-value { color: #f1f5f9 !important; }
    .em-text { color: #cbd5e1 !important; }
    .em-label, .em-foot { color: #94a3b8 !important; }
    .em-rule { border-bottom-color: #334155 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;">
${renderPreheader(options.preheader)}
<div class="em-page" style="margin:0;padding:24px 12px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div class="em-card" style="max-width:560px;margin:0 auto;padding:28px;border-radius:14px;background-color:#ffffff;border:1px solid #e2e8f0;">
    <p class="em-heading" style="margin:0 0 20px;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#0f172a;">${escapeHtml(options.appName)}</p>
    <h1 class="em-heading" style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#0f172a;">${escapeHtml(options.heading)}</h1>
    ${intro}
    ${details}
    ${cta}
    ${footNote}
  </div>
</div>
</body>
</html>`

  return { html, text: renderEmailText(options) }
}

/**
 * The same message without markup. A mail client that shows this instead of the HTML gets a
 * readable message rather than a blank one, and a spam filter reading an HTML-only message
 * scores it worse.
 */
function renderEmailText(options: EmailLayoutOptions): string {
  const blocks: string[] = [options.heading, ...options.intro]

  if (options.details?.length) {
    blocks.push(options.details.map(detail => `${detail.label}: ${detail.value}`).join('\n'))
  }

  if (options.ctaLabel && options.ctaUrl) {
    blocks.push(`${options.ctaLabel}: ${options.ctaUrl}`)
  }

  if (options.footNote) {
    blocks.push(options.footNote)
  }

  return `${blocks.join('\n\n')}\n`
}

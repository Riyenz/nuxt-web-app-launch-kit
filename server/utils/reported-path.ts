// Routes that carry their whole credential in the path, such as an invite or a magic link:
// anyone holding the path can act on it, so a report keeps the route and drops the token. Add
// the route prefix here, as both the page and the API call behind it. Empty until the app has one.
const TOKEN_ROUTES: readonly string[] = []

// A query string after a path inside free text, such as the URL in Nitro's own
// "[request error] [unhandled] [GET] https://…" line.
const QUERY_IN_TEXT = /(\/[^\s/?#"'`]*)\?[^\s#"'`]*/g

// Tokens are base64url or hex, so the match stops at the dot of a stack frame's file name
// (`_token_.post.mjs:88`).
function buildTokenPattern(tokenRoutes: readonly string[]): RegExp | null {
  if (tokenRoutes.length === 0) {
    return null
  }

  const routes = tokenRoutes.map(route => route.replace(/^\/|\/$/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  return new RegExp(`(\\/(?:${routes.join('|')})\\/)[\\w-]+`, 'g')
}

// H3 decodes these characters before routing, including in the route name itself.
function decodeTokenCharacters(text: string): string {
  return text.replace(/%([\da-fA-F]{2})/g, function decodeCharacter(encoded: string, hex: string) {
    const character = String.fromCharCode(Number.parseInt(hex, 16))

    return /[\w-]/.test(character) ? character : encoded
  })
}

function hideTokens(text: string, tokenRoutes: readonly string[]): string {
  const pattern = buildTokenPattern(tokenRoutes)

  return pattern ? decodeTokenCharacters(text).replace(pattern, '$1[token]') : text
}

/** The path as PostHog may see it: no query string (filters can name people) and no link token. */
export function toReportedPath(path: string, tokenRoutes: readonly string[] = TOKEN_ROUTES): string {
  const [pathname = ''] = path.split(/[?#]/, 1)

  return hideTokens(pathname, tokenRoutes)
}

/** The same rule over a whole console line, which can quote a request URL anywhere in it. */
export function toReportedText(text: string, tokenRoutes: readonly string[] = TOKEN_ROUTES): string {
  return hideTokens(text.replace(QUERY_IN_TEXT, '$1'), tokenRoutes)
}

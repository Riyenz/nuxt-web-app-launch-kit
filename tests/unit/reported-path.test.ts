import { describe, expect, it } from 'vitest'
import { toReportedPath, toReportedText } from '~~/server/utils/reported-path'

const TOKEN_ROUTES = ['/invite', '/api/invite']

describe('toReportedPath', () => {
  it('drops the query string and the fragment', () => {
    expect(toReportedPath('/api/users?email=alice@example.com&page=2#top')).toBe('/api/users')
  })

  it('keeps a path that carries no token as it is', () => {
    expect(toReportedPath('/api/users/42', TOKEN_ROUTES)).toBe('/api/users/42')
  })

  it('replaces the token of a token route, as a page and as an API call', () => {
    expect(toReportedPath('/invite/Ab3_x-9Zq', TOKEN_ROUTES)).toBe('/invite/[token]')
    expect(toReportedPath('/api/invite/Ab3_x-9Zq/accept?ref=mail', TOKEN_ROUTES)).toBe('/api/invite/[token]/accept')
  })

  it('catches a token whose characters are percent-encoded', () => {
    expect(toReportedPath('/invite/%41b3%5Fx', TOKEN_ROUTES)).toBe('/invite/[token]')
  })

  it('leaves a route that only starts with the same letters alone', () => {
    expect(toReportedPath('/invitations/42', TOKEN_ROUTES)).toBe('/invitations/42')
  })
})

describe('toReportedText', () => {
  it('drops query strings from every URL in a console line', () => {
    const line = '[request error] [unhandled] [GET] https://app.example.com/api/users?email=alice@example.com failed'

    expect(toReportedText(line)).toBe('[request error] [unhandled] [GET] https://app.example.com/api/users failed')
  })

  it('hides a token in a quoted URL', () => {
    const line = 'Invite failed for https://app.example.com/invite/Ab3_x-9Zq?ref=mail'

    expect(toReportedText(line, TOKEN_ROUTES)).toBe('Invite failed for https://app.example.com/invite/[token]')
  })

  it('stops at the dot of a stack frame file name, so the frame stays readable', () => {
    const line = '    at handler (/var/task/chunks/routes/api/invite/_token_.post.mjs:88:5)'

    expect(toReportedText(line, TOKEN_ROUTES)).toBe('    at handler (/var/task/chunks/routes/api/invite/[token].post.mjs:88:5)')
  })
})

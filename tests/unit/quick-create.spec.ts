import { describe, expect, it } from 'vitest'
import { QUICK_CREATE_TTL_SECONDS, parseQuickCreateRequest } from '../../server/utils/quick-create'

describe('quick-create request parsing', () => {
  it('parses a raw target URL', () => {
    expect(parseQuickCreateRequest(new URL('https://link.example.com/demo/https://example.com/path'))).toEqual({
      slug: 'demo',
      targetUrl: 'https://example.com/path',
    })
  })

  it('carries the request query into the target URL', () => {
    expect(parseQuickCreateRequest(new URL('https://link.example.com/demo/https://example.com/path?x=1&y=2'))).toEqual({
      slug: 'demo',
      targetUrl: 'https://example.com/path?x=1&y=2',
    })
  })

  it('accepts a fully encoded target URL including a fragment', () => {
    expect(parseQuickCreateRequest(new URL('https://link.example.com/demo/https%3A%2F%2Fexample.com%2Fpath%3Fx%3D1%23section'))).toEqual({
      slug: 'demo',
      targetUrl: 'https://example.com/path?x=1#section',
    })
  })

  it('ignores unrelated multi-segment paths', () => {
    expect(parseQuickCreateRequest(new URL('https://link.example.com/dashboard/links'))).toBeNull()
    expect(parseQuickCreateRequest(new URL('https://link.example.com/demo/not-a-url'))).toBeNull()
  })

  it('uses a seven-day default expiration window', () => {
    expect(QUICK_CREATE_TTL_SECONDS).toBe(7 * 24 * 60 * 60)
  })
})

import { describe, expect, it } from 'vitest'
import { QUICK_CREATE_TTL_SECONDS, isSafeQuickCreateReturnPath, parseQuickCreateRoute } from '../../server/utils/quick-create'

describe('quick-create route parsing', () => {
  it('detects a raw target URL without consuming its browser-only fragment', () => {
    expect(parseQuickCreateRoute(new URL('https://link.example.com/demo/https://example.com/path?x=1#section'))).toEqual({
      slug: 'demo',
    })
  })

  it('accepts a fully encoded target URL for backwards compatibility', () => {
    expect(parseQuickCreateRoute(new URL('https://link.example.com/demo/https%3A%2F%2Fexample.com%2Fpath%3Fx%3D1%23section'))).toEqual({
      slug: 'demo',
    })
  })

  it('ignores unrelated multi-segment paths', () => {
    expect(parseQuickCreateRoute(new URL('https://link.example.com/dashboard/links'))).toBeNull()
    expect(parseQuickCreateRoute(new URL('https://link.example.com/demo/not-a-url'))).toBeNull()
  })

  it('only accepts local quick-create return paths', () => {
    expect(isSafeQuickCreateReturnPath('/demo/https://example.com/path?x=1#section')).toBe(true)
    expect(isSafeQuickCreateReturnPath('//evil.example.com/demo/https://example.com')).toBe(false)
    expect(isSafeQuickCreateReturnPath('https://evil.example.com/')).toBe(false)
    expect(isSafeQuickCreateReturnPath('/dashboard/links')).toBe(false)
  })

  it('uses a seven-day default expiration window', () => {
    expect(QUICK_CREATE_TTL_SECONDS).toBe(7 * 24 * 60 * 60)
  })
})

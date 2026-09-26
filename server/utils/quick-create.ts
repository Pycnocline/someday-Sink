export const QUICK_CREATE_TTL_SECONDS = 7 * 24 * 60 * 60

export interface QuickCreateRoute {
  slug: string
}

export function parseQuickCreateRoute(requestUrl: URL): QuickCreateRoute | null {
  const pathname = requestUrl.pathname.replace(/^\/+/, '')
  const separator = pathname.indexOf('/')
  if (separator <= 0)
    return null

  const rawSlug = pathname.slice(0, separator)
  const rawTarget = pathname.slice(separator + 1)
  if (!rawTarget)
    return null

  let target = rawTarget
  if (!/^https?:\/\//i.test(target)) {
    try {
      target = decodeURIComponent(target)
    }
    catch {
      return null
    }
  }

  if (!/^https?:\/\//i.test(target))
    return null

  try {
    return { slug: decodeURIComponent(rawSlug) }
  }
  catch {
    return null
  }
}

export function isSafeQuickCreateReturnPath(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//'))
    return false

  try {
    return parseQuickCreateRoute(new URL(value, 'https://sink.invalid')) !== null
  }
  catch {
    return false
  }
}

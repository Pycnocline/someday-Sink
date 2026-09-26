export const QUICK_CREATE_TTL_SECONDS = 7 * 24 * 60 * 60

export interface QuickCreateRequest {
  slug: string
  targetUrl: string
}

export function parseQuickCreateRequest(requestUrl: URL): QuickCreateRequest | null {
  const pathname = requestUrl.pathname.replace(/^\//, '')
  const separator = pathname.indexOf('/')
  if (separator <= 0)
    return null

  const slug = pathname.slice(0, separator)
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

  let targetUrl: URL
  try {
    targetUrl = new URL(target)
  }
  catch {
    return null
  }

  for (const [key, value] of requestUrl.searchParams)
    targetUrl.searchParams.append(key, value)

  return {
    slug,
    targetUrl: targetUrl.toString(),
  }
}

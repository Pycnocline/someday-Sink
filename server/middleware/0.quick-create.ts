import { CreateLinkSchema } from '#shared/schemas/link'
import { readCompletedLinkMigrationMarker } from '../services/link-store/migration'
import { QUICK_CREATE_TTL_SECONDS, parseQuickCreateRequest } from '../utils/quick-create'

export default eventHandler(async (event) => {
  if (event.method !== 'GET')
    return

  const quickCreate = parseQuickCreateRequest(getRequestURL(event))
  if (!quickCreate)
    return

  const accessIdentity = await verifyCloudflareAccess(event)
  if (!accessIdentity) {
    throw createError({
      status: 401,
      statusText: 'Cloudflare Access login required',
    })
  }

  if (!isCloudflareAccessRequestAllowed(event)) {
    throw createError({
      status: 403,
      statusText: 'Forbidden',
    })
  }

  Object.assign(
    event.context,
    mapCloudflareAccessIdentity(accessIdentity, getRequestURL(event).hostname),
  )

  if (!await readCompletedLinkMigrationMarker(event.context.cloudflare.env)) {
    throw createError({
      status: 423,
      statusText: 'Link migration is required',
    })
  }

  const { reserveSlug } = useAppConfig()
  if (quickCreate.slug === 'api' || reserveSlug.includes(quickCreate.slug)) {
    throw createError({
      status: 400,
      statusText: 'Reserved short-link slug',
    })
  }

  const parsed = CreateLinkSchema.safeParse({
    url: quickCreate.targetUrl,
    slug: quickCreate.slug,
    expiration: Math.floor(Date.now() / 1000) + QUICK_CREATE_TTL_SECONDS,
  })
  if (!parsed.success) {
    throw createError({
      status: 400,
      statusText: 'Invalid quick-create link',
    })
  }

  const link = parsed.data
  await prepareIncomingLink(event, link)

  if (!await createLink(event, link)) {
    throw createError({
      status: 409,
      statusText: 'Link already exists',
    })
  }

  const { shortLink } = buildLinkResponse(event, link)
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Location', shortLink)
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  setResponseStatus(event, 201)
  return `${shortLink}\n`
})

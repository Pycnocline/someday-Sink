import { z } from 'zod'
import { CreateLinkSchema, SlugSchema, UrlSchema } from '#shared/schemas/link'
import { QUICK_CREATE_TTL_SECONDS } from '../../utils/quick-create'

const QuickCreateRequestSchema = z.object({
  url: UrlSchema,
  slug: SlugSchema,
})

defineRouteMeta({
  openAPI: {
    description: 'Create a seven-day short link from the browser quick-create flow',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url', 'slug'],
            properties: {
              url: { type: 'string', description: 'Complete target URL, including query string and fragment when present' },
              slug: { type: 'string', description: 'Custom short-link slug' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const input = await readValidatedBody(event, QuickCreateRequestSchema.parse)
  const slug = normalizeSlug(event, input.slug)
  const { reserveSlug } = useAppConfig()

  if (slug === 'api' || reserveSlug.includes(slug)) {
    throw createError({
      status: 400,
      statusText: 'Reserved short-link slug',
    })
  }

  const link = CreateLinkSchema.parse({
    url: input.url,
    slug,
    expiration: Math.floor(Date.now() / 1000) + QUICK_CREATE_TTL_SECONDS,
  })

  await prepareIncomingLink(event, link)

  if (!await createLink(event, link)) {
    throw createError({
      status: 409,
      statusText: 'Link already exists',
    })
  }

  setResponseStatus(event, 201)
  return buildLinkResponse(event, link)
})

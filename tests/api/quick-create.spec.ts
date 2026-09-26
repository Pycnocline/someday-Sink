import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QUICK_CREATE_TTL_SECONDS } from '../../server/utils/quick-create'
import { deleteStoredLinks, postJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs: string[] = []

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  await deleteStoredLinks(createdSlugs)
  createdSlugs.length = 0
})

describe('/api/link/quick-create', { concurrent: false }, () => {
  it('creates a seven-day link while preserving query and fragment', async () => {
    const slug = `quick-${crypto.randomUUID()}`
    const url = 'https://example.com/path?x=1#section'
    const before = Math.floor(Date.now() / 1000)

    const response = await postJson('/api/link/quick-create', { slug, url })
    const after = Math.floor(Date.now() / 1000)

    expect(response.status).toBe(201)
    createdSlugs.push(slug)

    const data = await response.json() as {
      link: { slug: string, url: string, expiration?: number }
      shortLink: string
    }

    expect(data.link.slug).toBe(slug)
    expect(data.link.url).toBe(url)
    expect(data.link.expiration).toBeGreaterThanOrEqual(before + QUICK_CREATE_TTL_SECONDS)
    expect(data.link.expiration).toBeLessThanOrEqual(after + QUICK_CREATE_TTL_SECONDS)
    expect(data.shortLink).toContain(`/${slug}`)
  })

  it('requires authentication', async () => {
    const response = await postJson('/api/link/quick-create', {
      slug: `quick-auth-${crypto.randomUUID()}`,
      url: 'https://example.com',
    }, false)

    expect(response.status).toBe(401)
  })

  it('does not overwrite an existing slug', async () => {
    const slug = `quick-conflict-${crypto.randomUUID()}`
    createdSlugs.push(slug)

    expect((await postJson('/api/link/quick-create', {
      slug,
      url: 'https://example.com/one',
    })).status).toBe(201)

    expect((await postJson('/api/link/quick-create', {
      slug,
      url: 'https://example.com/two',
    })).status).toBe(409)
  })
})

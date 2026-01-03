import { Hono } from 'hono'
import type { Bindings, ShareRecord, CreateShareResponse, GetShareResponse, ErrorResponse } from '../types'
import { generateCode, normalizeCode, isValidCode } from '../lib/codes'

const MAX_SIZE = 500 * 1024 // 500KB
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

const app = new Hono<{ Bindings: Bindings }>()

// POST /api/share - Create share
app.post('/', async (c) => {
  const body = await c.req.text()

  if (!body || !body.trim()) {
    return c.json<ErrorResponse>({
      error: 'invalid_request',
      message: 'Request body must contain markdown'
    }, 400)
  }

  const byteLength = new TextEncoder().encode(body).length
  if (byteLength > MAX_SIZE) {
    return c.json<ErrorResponse>({
      error: 'content_too_large',
      message: 'Markdown content exceeds 500KB limit'
    }, 413)
  }

  // Generate unique code (retry on collision)
  let code: string = ''
  let attempts = 0
  do {
    code = generateCode()
    const existing = await c.env.SHARES.get(`share:${code}`)
    if (!existing) break
    attempts++
  } while (attempts < 3)

  if (attempts >= 3) {
    return c.json<ErrorResponse>({
      error: 'server_error',
      message: 'Failed to generate unique code'
    }, 500)
  }

  const createdAt = Date.now()
  const expiresAt = new Date(createdAt + TTL_SECONDS * 1000).toISOString()

  const record: ShareRecord = {
    markdown: body,
    createdAt
  }

  await c.env.SHARES.put(
    `share:${code}`,
    JSON.stringify(record),
    { expirationTtl: TTL_SECONDS }
  )

  return c.json<CreateShareResponse>({
    code,
    url: `${c.env.FRONTEND_URL}?c=${code}`,
    expiresAt
  }, 201)
})

// GET /api/share/:code - Retrieve share
app.get('/:code', async (c) => {
  const rawCode = c.req.param('code')
  const code = normalizeCode(rawCode)

  if (!isValidCode(code)) {
    return c.json<ErrorResponse>({
      error: 'invalid_code',
      message: 'Share code must be 6 characters from [2-9A-HJKMNP-Z]'
    }, 400)
  }

  const data = await c.env.SHARES.get<ShareRecord>(`share:${code}`, 'json')

  if (!data) {
    return c.json<ErrorResponse>({
      error: 'not_found',
      message: 'Share code not found'
    }, 404)
  }

  const expiresAt = new Date(data.createdAt + TTL_SECONDS * 1000).toISOString()

  return c.json<GetShareResponse>({
    markdown: data.markdown,
    createdAt: new Date(data.createdAt).toISOString(),
    expiresAt
  })
})

export { app as shareRoutes }

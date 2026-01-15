# Short Code Sharing

## 1. Overview

Enable sharing markdown documents via short codes for easy mobile access. A CLI tool or web UI creates a share, returning a 6-character code. Recipients access shared markdown via URL or code entry.

### Problem Statement

The current base64 URL encoding approach creates URLs that are:
- Extremely long for typical spec documents
- Difficult to copy from mobile SSH clients (e.g., Termius)
- Impractical to share via text or voice

### Solution

Server-side storage with short codes that are easy to copy and type.

---

## 2. Actors

| Actor | Description |
|-------|-------------|
| **Creator** | Person sharing markdown for annotation (typically via CLI from terminal) |
| **Annotator** | Person viewing and annotating the shared markdown (typically on mobile) |

---

## 3. Core Concepts

### Share

- A markdown document stored server-side with a unique short code
- Expires after 7 days
- Immutable once created (no editing)

### Short Code

- 6 characters from set: `[2-9A-HJKMNP-Z]` (excludes 0, 1, O, I, L to avoid ambiguity)
- Case-insensitive (displayed uppercase, accepted any case)
- 31^6 = ~887 million possible combinations
- Example: `X7KM3P`

---

## 4. Functional Requirements

### 4.1 Create Share

| ID | Requirement |
|----|-------------|
| CR-1 | System shall accept markdown content and return a unique short code |
| CR-2 | System shall accept markdown via HTTP POST (for CLI usage) |
| CR-3 | System shall accept markdown via web UI (paste + button) |
| CR-4 | System shall return both the short code and full URL |
| CR-5 | System shall reject markdown exceeding 500KB |
| CR-6 | System shall generate codes that do not collide with existing active codes |

#### Create via CLI

**Request:**
```
POST /api/share
Content-Type: text/markdown

# My Specification
...markdown content...
```

**Response (success, 201 Created):**
```json
{
  "code": "X7KM3P",
  "url": "https://example.com?c=X7KM3P",
  "expiresAt": "2025-01-09T14:30:00Z"
}
```

**Response (error - too large, 413 Payload Too Large):**
```json
{
  "error": "content_too_large",
  "message": "Markdown content exceeds 500KB limit"
}
```

**Response (error - invalid request, 400 Bad Request):**
```json
{
  "error": "invalid_request",
  "message": "Request body must contain markdown"
}
```

#### Create via Web UI

- Button labeled "Get Share Code" in InputView (alongside existing Share URL button)
- On success: Display code prominently with copyable URL and expiration notice
- On error: Display appropriate error message

### 4.2 Access Share

| ID | Requirement |
|----|-------------|
| AC-1 | System shall load shared markdown when URL contains `?c={code}` parameter |
| AC-2 | System shall provide a code entry field on the home page |
| AC-3 | System shall accept codes case-insensitively |
| AC-4 | System shall display clear error for invalid or unknown codes |
| AC-5 | System shall navigate directly to annotation view after loading shared content |
| AC-6 | When multiple URL parameters are present, `?c={code}` takes precedence over `?markdown=` or `?md=` |

#### Access via URL

1. User visits `https://example.com?c=X7KM3P`
2. Frontend calls `GET /api/share/X7KM3P`
3. Markdown loads into state
4. Automatically transitions to annotation view

#### Access via Code Entry

1. User sees "Have a share code?" input on InputView
2. Enters code, presses Enter or clicks "Load"
3. Same flow as URL access

### 4.3 Retrieve Share (API)

**Request:**
```
GET /api/share/{code}
```

**Response (success, 200 OK):**
```json
{
  "markdown": "# My Specification\n...",
  "createdAt": "2025-01-02T14:30:00Z",
  "expiresAt": "2025-01-09T14:30:00Z"
}
```

**Response (not found, 404 Not Found):**
```json
{
  "error": "not_found",
  "message": "Share code not found"
}
```

**Response (invalid code, 400 Bad Request):**
```json
{
  "error": "invalid_code",
  "message": "Share code must be 6 characters from [2-9A-HJKMNP-Z]"
}
```

### 4.4 Expiration

| ID | Requirement |
|----|-------------|
| EX-1 | Shares shall expire 7 days after creation |
| EX-3 | Expiration time shall be communicated to creator at creation time |

### 4.5 Annotations on Shared Content

| ID | Requirement |
|----|-------------|
| AN-1 | Annotations on shared content shall be stored in localStorage |
| AN-2 | Annotations shall be keyed by share code (not content hash) for shared content |
| AN-3 | Annotator can copy all feedback as markdown (existing functionality) |

---

## 5. User Flows

### 5.1 Creator Flow (CLI)

```
┌─────────────────────────────────────────────────────────────┐
│ Terminal (SSH via Termius)                                  │
├─────────────────────────────────────────────────────────────┤
│ $ specmark SPEC.md                                          │
│                                                             │
│ Share created! Expires in 7 days.                           │
│                                                             │
│ URL:  https://annotate.example.com?c=X7KM3P                 │
│ Code: X7KM3P                                                │
└─────────────────────────────────────────────────────────────┘
```

User copies the short URL or just the code from Termius.

### 5.2 Creator Flow (Web)

1. User pastes markdown in InputView
2. Clicks "Get Share Code"
3. Modal/toast displays:
   - Code: `X7KM3P` (large, prominent)
   - Full URL (copyable)
   - "Expires in 7 days"

### 5.3 Annotator Flow

1. Opens URL `https://annotate.example.com?c=X7KM3P` on mobile
2. Markdown loads, transitions to annotation view
3. Selects text, adds feedback
4. Clicks "Copy All" to get formatted feedback
5. Pastes feedback back into terminal/chat

---

## 6. CLI Tool

Simple shell script using curl:

```bash
#!/bin/bash
# specmark - Create a share link for markdown annotation

if [ -z "$1" ]; then
  echo "Usage: specmark <file.md>"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "Error: File not found: $1"
  exit 1
fi

RESPONSE=$(curl -s -X POST "https://annotate.example.com/api/share" \
  -H "Content-Type: text/markdown" \
  --data-binary @"$1")

CODE=$(echo "$RESPONSE" | jq -r '.code // empty')
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ -n "$ERROR" ]; then
  MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
  echo "Error: $MESSAGE"
  exit 1
fi

URL=$(echo "$RESPONSE" | jq -r '.url')
EXPIRES=$(echo "$RESPONSE" | jq -r '.expiresAt')

echo ""
echo "Share created! Expires: $EXPIRES"
echo ""
echo "URL:  $URL"
echo "Code: $CODE"
echo ""
```

---

## 7. Technical Implementation

### 7.1 Stack

| Component | Technology |
|-----------|------------|
| Runtime | Cloudflare Workers |
| Framework | Hono (TypeScript) |
| Storage | Cloudflare KV |
| Deployment | GitHub Actions → Wrangler |

### 7.2 Project Structure

```
markdown-annotator/
├── src/                    # Frontend (existing)
├── worker/                 # Cloudflare Worker API
│   ├── src/
│   │   ├── index.ts        # Hono app entry point
│   │   ├── routes/
│   │   │   └── share.ts    # /api/share routes
│   │   ├── lib/
│   │   │   ├── codes.ts    # Code generation
│   │   │   └── kv.ts       # KV helpers
│   │   └── types.ts        # TypeScript types
│   ├── wrangler.toml       # Worker config
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy-worker.yml
└── package.json            # Root package.json (workspace)
```

### 7.3 Worker Configuration (wrangler.toml)

```toml
name = "markdown-annotator-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SHARES"
id = "<KV_NAMESPACE_ID>"
preview_id = "<KV_PREVIEW_ID>"

[vars]
FRONTEND_URL = "https://your-frontend.com"
```

### 7.4 Hono App Structure

```typescript
// worker/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { shareRoutes } from './routes/share'

type Bindings = {
  SHARES: KVNamespace
  FRONTEND_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS for frontend
app.use('/api/*', cors({
  origin: (origin, c) => {
    const allowed = [c.env.FRONTEND_URL, 'http://localhost:5173']
    return allowed.includes(origin) ? origin : null
  }
}))

// Mount routes
app.route('/api/share', shareRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

### 7.5 Storage (Cloudflare KV)

**Share record:**
- Key: `share:{CODE}` (e.g., `share:X7KM3P`)
- Value: JSON string `{ "markdown": "...", "createdAt": 1704200000000 }`
- TTL: 604800 seconds (7 days) - set at write time via `expirationTtl`

**Example KV operations:**
```typescript
// Write with TTL
await env.SHARES.put(
  `share:${code}`,
  JSON.stringify({ markdown, createdAt: Date.now() }),
  { expirationTtl: 604800 }
)

// Read
const data = await env.SHARES.get(`share:${code}`, 'json')
```

### 7.6 Code Generation

```typescript
// worker/src/lib/codes.ts
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // 31 chars
const CODE_LENGTH = 6

export function generateCode(): string {
  let code = ''
  const array = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(array)
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[array[i] % ALPHABET.length]
  }
  return code
}

export function normalizeCode(code: string): string {
  return code.toUpperCase().trim()
}

export function isValidCode(code: string): boolean {
  const normalized = normalizeCode(code)
  if (normalized.length !== CODE_LENGTH) return false
  return [...normalized].every(c => ALPHABET.includes(c))
}
```

### 7.7 API Routes Implementation

```typescript
// worker/src/routes/share.ts
import { Hono } from 'hono'
import { generateCode, normalizeCode, isValidCode } from '../lib/codes'

const MAX_SIZE = 500 * 1024 // 500KB
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

const app = new Hono<{ Bindings: Bindings }>()

// POST /api/share - Create share
app.post('/', async (c) => {
  const body = await c.req.text()

  if (!body || !body.trim()) {
    return c.json({ error: 'invalid_request', message: 'Request body must contain markdown' }, 400)
  }

  if (body.length > MAX_SIZE) {
    return c.json({ error: 'content_too_large', message: 'Markdown content exceeds 500KB limit' }, 413)
  }

  // Generate unique code (retry on collision)
  let code: string
  let attempts = 0
  do {
    code = generateCode()
    const existing = await c.env.SHARES.get(`share:${code}`)
    if (!existing) break
    attempts++
  } while (attempts < 3)

  if (attempts >= 3) {
    return c.json({ error: 'server_error', message: 'Failed to generate unique code' }, 500)
  }

  const createdAt = Date.now()
  const expiresAt = new Date(createdAt + TTL_SECONDS * 1000).toISOString()

  await c.env.SHARES.put(
    `share:${code}`,
    JSON.stringify({ markdown: body, createdAt }),
    { expirationTtl: TTL_SECONDS }
  )

  return c.json({
    code,
    url: `${c.env.FRONTEND_URL}?c=${code}`,
    expiresAt
  }, 201)
})

// GET /api/share/:code - Retrieve share
app.get('/:code', async (c) => {
  const code = normalizeCode(c.req.param('code'))

  if (!isValidCode(code)) {
    return c.json({
      error: 'invalid_code',
      message: 'Share code must be 6 characters from [2-9A-HJKMNP-Z]'
    }, 400)
  }

  const data = await c.env.SHARES.get(`share:${code}`, 'json')

  if (!data) {
    return c.json({ error: 'not_found', message: 'Share code not found' }, 404)
  }

  const expiresAt = new Date(data.createdAt + TTL_SECONDS * 1000).toISOString()

  return c.json({
    markdown: data.markdown,
    createdAt: new Date(data.createdAt).toISOString(),
    expiresAt
  })
})

export { app as shareRoutes }
```

### 7.8 GitHub Actions Deployment

```yaml
# .github/workflows/deploy-worker.yml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - 'worker/**'
      - '.github/workflows/deploy-worker.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: ./worker
        run: npm ci

      - name: Deploy to Cloudflare
        working-directory: ./worker
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 7.9 Local Development

```bash
# Install dependencies
cd worker && npm install

# Create KV namespace (one-time)
npx wrangler kv:namespace create SHARES
npx wrangler kv:namespace create SHARES --preview

# Update wrangler.toml with returned IDs

# Run locally
npx wrangler dev

# Test
curl -X POST http://localhost:8787/api/share \
  -H "Content-Type: text/markdown" \
  -d "# Hello World"
```

---

## 8. Out of Scope (v1)

- Authentication / private shares
- Editing shares after creation
- Server-side annotation storage
- Share analytics / view counts
- Custom expiration times
- Share deletion by creator

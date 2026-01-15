# Specmark

A web application for annotating Markdown specifications with highlights and comments, designed to generate structured feedback for LLM coding agents.

## Features

- **Markdown Input**: Paste any Markdown document into a large textarea
- **Text Selection**: Select any text in the rendered Markdown to add feedback
- **Floating Annotations**: Compact floating UI for adding comments without leaving context
- **Visual Highlights**: Yellow highlights for existing annotations, blue for active selection
- **Share Codes**: Generate short 6-character codes for easy mobile sharing
- **Export**: Copy all feedback as formatted Markdown to clipboard
- **Persistent Annotations**: Annotations saved to localStorage, keyed by content or share code

## Analytics

Specmark uses **Umami Analytics** for anonymous, privacy-friendly usage tracking. The tracker script is injected at runtime when the following environment variables are set:

- `VITE_UMAMI_SCRIPT_URL` (e.g. `https://analytics.example.com/script.js`)
- `VITE_UMAMI_WEBSITE_ID` (the Umami website UUID)
- Optional: `VITE_UMAMI_HOST_URL` (if your script is hosted separately from the collector)
- Optional: `VITE_UMAMI_DOMAINS` (comma-separated list of allowed domains)

The app records:

- Page views (default Umami behavior)
- `Share Create` when a share code is successfully created
- `Share Load` when a share code is successfully retrieved
- `Copy All` when feedback is copied to the clipboard

No PII or document content is sent with these events.

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS + @tailwindcss/typography
- react-markdown

### Backend (Share Code API)
- Cloudflare Workers
- Hono (TypeScript)
- Cloudflare KV (storage)

## Project Structure

```
specmark/
├── src/                    # Frontend React app
├── worker/                 # Cloudflare Worker API
│   ├── src/
│   │   ├── index.ts        # Hono app entry point
│   │   ├── routes/share.ts # API routes
│   │   └── lib/codes.ts    # Code generation
│   ├── wrangler.toml       # Worker config
│   └── package.json
├── cli/
│   └── specmark            # CLI tool for creating shares
├── specs/                  # Feature specifications
└── .github/workflows/      # GitHub Actions
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Install frontend dependencies
npm install

# Install worker dependencies
cd worker && npm install
```

### Local Development

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start worker API
cd worker && npm run dev
```

- Frontend: http://localhost:5173
- Worker API: http://localhost:8787

## Usage

### Web Interface

1. **Paste Markdown**: Enter your Markdown content in the textarea
2. **Get Share Code**: Click "Get Share Code" to generate a short code for sharing
3. **Start Annotating**: Click "Start Annotating" to enter annotation mode
4. **Select Text**: Highlight text to add feedback via the floating comment box
5. **Copy Feedback**: Click "Copy All" to export annotations as Markdown

### Loading Shared Content

- **Via URL**: `https://specmark.dev?c=X7KM3P`
- **Via Code Entry**: Enter the 6-character code in the header input field

### CLI Tool

Create share links directly from your terminal:

```bash
# Add to PATH or use directly
./cli/specmark path/to/document.md

# Output:
# Share created!
# URL:  https://specmark.dev?c=X7KM3P
# Code: X7KM3P
# Expires: 2025-01-10
```

For local development:
```bash
export SPECMARK_API_URL=http://localhost:8787
./cli/specmark document.md
```

### Legacy URL Sharing

The original base64 URL encoding is still supported:
- `?markdown=<base64-encoded-content>`
- `?md=<url-encoded-content>`

## Production Deployment

Specmark uses **Cloudflare Pages** for static hosting and **Cloudflare Workers** for the API, with path-based routing (`/api/*`) to keep everything on the same domain.

### Architecture

- **Frontend**: `https://specmark.dev` (Cloudflare Pages)
- **API**: `https://specmark.dev/api/*` (Cloudflare Worker)
- **Routing**: `public/_routes.json` excludes `/api/*` from Pages, routes to Worker

This same-origin setup eliminates CORS complexity and provides a cleaner user experience.

### 1. Create Cloudflare Account & KV Namespace

```bash
# Login to Cloudflare
cd worker
npx wrangler login

# Create production KV namespace
npx wrangler kv:namespace create SHARES --env production
# Note the ID returned, e.g., "abc123..."
```

### 2. Update Worker Configuration

Edit `worker/wrangler.toml` and add the KV namespace ID:

```toml
[env.production]
kv_namespaces = [
  { binding = "SHARES", id = "your-kv-namespace-id-here" }
]
vars = { FRONTEND_URL = "https://specmark.dev" }
```

### 3. Deploy Worker

Deploy the Worker to `specmark.dev/api/*`:

```bash
cd worker
npx wrangler deploy --env production --route "specmark.dev/api/*"
```

**Via GitHub Actions (Automated):**

1. Create a Cloudflare API token at https://dash.cloudflare.com/profile/api-tokens
   - Use the "Edit Cloudflare Workers" template or create custom token with:
     - Workers Scripts: Edit
     - Workers KV Storage: Edit
     - Cloudflare Pages: Edit
2. Add GitHub secrets at `https://github.com/YOUR_USERNAME/specmark/settings/secrets/actions`:
   - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
   - `VITE_UMAMI_SCRIPT_URL` - (Optional) Your Umami analytics script URL
   - `VITE_UMAMI_WEBSITE_ID` - (Optional) Your Umami website ID
3. Push to main branch:
   - Worker changes (`worker/**`) trigger worker deployment
   - Frontend changes (`src/**`, `public/**`) trigger Pages deployment

### 4. Deploy Frontend to Cloudflare Pages

**Option A: GitHub Integration (Recommended)**

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Connect your GitHub repository
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty)
4. Deploy

The `public/_routes.json` file automatically configures routing so `/api/*` requests go to your Worker.

**Option B: Manual Deployment**

```bash
npm run build
npx wrangler pages deploy dist --project-name=specmark
```

### 5. Configure DNS

In Cloudflare DNS, set up your domain:

1. Add your domain to Cloudflare (if not already)
2. Cloudflare Pages will automatically configure the DNS records
3. Your Worker route (`specmark.dev/api/*`) uses the same domain

### 6. Verify Routing

Test that the setup works:

```bash
# Frontend (should return HTML)
curl https://specmark.dev

# API health check (should return JSON)
curl https://specmark.dev/health

# API endpoint (should work)
curl -X POST https://specmark.dev/api/share \
  -H "Content-Type: text/markdown" \
  -d "# Test"
```

### Local Development with Production API

To test against production:

```bash
# Frontend
VITE_API_URL=https://specmark.dev npm run dev

# CLI
export SPECMARK_API_URL=https://specmark.dev
./cli/specmark document.md
```

## API Reference

### Create Share

```
POST /api/share
Content-Type: text/markdown

<markdown content>
```

**Response (201):**
```json
{
  "code": "X7KM3P",
  "url": "https://example.com?c=X7KM3P",
  "expiresAt": "2025-01-10T00:00:00.000Z"
}
```

### Retrieve Share

```
GET /api/share/:code
```

**Response (200):**
```json
{
  "markdown": "# Document content...",
  "createdAt": "2025-01-03T00:00:00.000Z",
  "expiresAt": "2025-01-10T00:00:00.000Z"
}
```

## Output Format

Exported feedback is formatted as Markdown:

```markdown
## Feedback

> Selected text from the document

Your feedback comment here

---

> Another selected passage

Another comment
```

## Keyboard Shortcuts

- **Cmd/Ctrl + Enter**: Save feedback in comment dialog
- **Escape**: Cancel comment dialog

## Configuration

### Share Code Format

- 6 characters from `[2-9A-HJKMNP-Z]` (excludes confusable characters)
- Case-insensitive
- ~887 million possible combinations

### Expiration

Shares expire after 7 days automatically via Cloudflare KV TTL.

### Size Limits

- Maximum markdown size: 500KB

# strapi-builder-ai-mcp

An MCP (Model Context Protocol) plugin for Strapi that helps AI assistants build frontend applications for your Strapi backend.

## Installation

```bash
npm install strapi-builder-ai-mcp
# or
yarn add strapi-builder-ai-mcp
```

## Configuration

Add the plugin to your Strapi configuration:

```typescript
// config/plugins.ts (or config/env/production/plugins.ts)
export default ({ env }) => ({
  "strapi-builder-ai-mcp": {
    enabled: true,
    config: {
      strapiUrl: env("STRAPI_URL", "http://localhost:1337"),
      mediaUrl: env("MEDIA_URL", env("STRAPI_URL", "http://localhost:1337")),
      publicEndpoints: true,
      apiPrefix: "/api",
    },
  },
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strapiUrl` | string | `http://localhost:1337` | Base URL for API requests |
| `mediaUrl` | string | Same as `strapiUrl` | Base URL for media assets (images, files) |
| `publicEndpoints` | boolean | `true` | Whether GET endpoints require authentication |
| `apiPrefix` | string | `/api` | API path prefix |

### Environment Variables

```bash
# .env
STRAPI_URL=http://localhost:1337

# .env.production
STRAPI_URL=https://your-app.strapiapp.com
MEDIA_URL=https://your-app.media.strapiapp.com
```

## Available MCP Tools

### `get_project_context`

**Always call this first.** Returns Strapi configuration and available content types.

```json
{
  "strapiUrl": "https://your-app.strapiapp.com",
  "mediaUrl": "https://your-app.media.strapiapp.com",
  "publicEndpoints": true,
  "apiPrefix": "/api",
  "availableContentTypes": ["article", "landing-page", "category"]
}
```

### `get_api_structure`

Get an overview of all content types with endpoints, field counts, and relationships.

### `get_content_types`

Get detailed schema for specific content types.

**Parameters:**
- `includePlugins` (boolean, optional): Include plugin content types
- `filter` (string, optional): Filter by content type name

### `get_components`

Get component definitions and reusable field structures.

**Parameters:**
- `category` (string, optional): Filter by component category

### `get_collection_data`

Fetch collection data with pagination, filtering, and sorting.

**Parameters:**
- `contentType` (string, required): Content type to fetch
- `limit` (number, optional): Items per page (1-100, default: 10)
- `page` (number, optional): Page number (default: 1)
- `populate` (string | string[] | "*", optional): Fields to populate
- `filters` (object, optional): Filter criteria
- `sort` (string, optional): Sort field and direction

### `get_single_entry`

Fetch a specific entry by documentId.

**Parameters:**
- `contentType` (string, required): Content type
- `documentId` (string, required): Document ID
- `populate` (string | string[] | "*", optional): Fields to populate

## Best Practices for Frontend Development

Based on production patterns, here are recommended approaches when building frontends:

### 1. URL Helper Functions

```typescript
// lib/utils.ts
export function getStrapiURL() {
  return process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337"
}

export function getStrapiMedia(url: string): string {
  if (!url) return ''
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("//"))
    return url
  return `${getStrapiURL()}${url}`
}
```

### 2. Strapi Image Component

```typescript
// components/strapi-image.tsx
import Image from "next/image"
import { getStrapiMedia } from "@/lib/utils"

interface StrapiImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
}

export function StrapiImage({ src, alt, width, height, className }: StrapiImageProps) {
  const imageUrl = getStrapiMedia(src)

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  )
}
```

### 3. Next.js Image Configuration

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.strapiapp.com',
      },
    ],
  },
}
```

### 4. Type-Safe Block Rendering

```typescript
// types/blocks.ts
export type Block =
  | { __component: "blocks.hero"; heading: string; text: string; image: TImage }
  | { __component: "blocks.card-grid"; cards: TCard[] }
  | { __component: "blocks.featured-articles"; articles: TArticle[] }

// components/block-renderer.tsx
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, index) => {
    switch (block.__component) {
      case 'blocks.hero':
        return <Hero key={index} {...block} />
      case 'blocks.card-grid':
        return <CardGrid key={index} {...block} />
      case 'blocks.featured-articles':
        return <FeaturedArticles key={index} {...block} />
      default:
        return null
    }
  })
}
```

### 5. Data Fetching with Query Strings

```typescript
import qs from "qs"

async function getArticles(page = 1, search?: string) {
  const query = qs.stringify({
    sort: ['createdAt:desc'],
    pagination: { page, pageSize: 10 },
    populate: {
      featuredImage: { fields: ['url', 'alternativeText'] },
      author: { fields: ['name'] }
    },
    filters: search ? {
      $or: [
        { title: { $containsi: search } },
        { content: { $containsi: search } }
      ]
    } : undefined
  }, { encodeValuesOnly: true })

  const response = await fetch(`${getStrapiURL()}/api/articles?${query}`)
  return response.json()
}
```

### 6. Caching Strategy (Next.js 15+)

```typescript
import { cacheLife, cacheTag } from 'next/cache'

export async function getArticles() {
  'use cache'
  cacheLife('minutes')  // 30 minutes
  cacheTag('articles')

  // fetch data...
}

export async function getLandingPage() {
  'use cache'
  cacheLife('hours')  // 1 hour
  cacheTag('landing-page')

  // fetch data...
}
```

## MCP Endpoint

The plugin exposes an MCP endpoint at:

```
POST /api/strapi-builder-ai-mcp/mcp
```

### Authentication

The endpoint supports:
1. **OAuth Manager** - If the Strapi OAuth Manager plugin is installed
2. **Bearer Token** - Using Strapi API tokens

```bash
# Using Bearer token
curl -X POST https://your-strapi.com/api/strapi-builder-ai-mcp/mcp \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "get_project_context"}}'
```

## Claude Desktop Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "strapi-builder-ai": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-app.strapiapp.com/api/strapi-builder-ai-mcp/mcp",
        "--header",
        "Authorization: Bearer your-api-token"
      ]
    }
  }
}
```

## Workflow

When building a frontend with this MCP:

1. **Call `get_project_context` first** - Get URLs, auth requirements, and available content types
2. **Call `get_api_structure`** - Understand the data model and relationships
3. **Call `get_content_types`** - Get detailed schemas for types you'll use
4. **Call `get_collection_data`** - Fetch sample data to understand the shape
5. **Generate code** - Use the context to generate type-safe frontend code

## License

MIT

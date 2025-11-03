---
layout: home

hero:
  name: "@adi-family/http"
  text: "Framework-Agnostic HTTP Interface"
  tagline: Type-safe, config-based API contracts for client and server
  image:
    src: /logo.svg
    alt: "@adi-family/http"
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/adi-family/http

features:
  - icon: 🎯
    title: Framework Agnostic
    details: Works with Express, Native Node.js HTTP, or any framework. Not locked into a specific ecosystem.

  - icon: 🔒
    title: Type-Safe
    details: Full TypeScript inference from config to client. Catch errors at compile time, not runtime.

  - icon: 📝
    title: Config-Based Contracts
    details: API definitions are pure configuration objects. Share contracts between client and server.

  - icon: ⚡
    title: Zero Boilerplate
    details: Auto-generates URL builders, parsers, and matchers. 80% less code for common patterns.

  - icon: 🎨
    title: Progressive API
    details: Start simple with route.static(), scale to route.full() for complete control. Simple cases stay simple.

  - icon: ✅
    title: Built-in Validation
    details: Automatic Zod validation for query and body. Params used only for URL building.

  - icon: 🔌
    title: Multiple Adapters
    details: Express adapter for existing apps. Native adapter for zero dependencies. More adapters coming.

  - icon: 🚀
    title: DRY Principle
    details: Single source of truth for routes. No duplicate build/pattern definitions. Changes reflected everywhere.

  - icon: 📦
    title: Lightweight
    details: Core package is tiny. Only include adapters you need. Tree-shakeable and optimized.
---

## Quick Example

::: code-group

```typescript [Route Definition]
import { route } from '@adi-family/http'
import { z } from 'zod'

export const getUserConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/users/:id',
    z.object({ id: z.string() })
  ),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    })
  }
} as const
```

```typescript [Server (Express)]
import express from 'express'
import { handler } from '@adi-family/http'
import { serveExpress } from '@adi-family/http-express'
import { getUserConfig } from './contracts'

const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)
  return user
})

const app = express()
app.use(express.json())
serveExpress(app, [getUserHandler])
app.listen(3000)
```

```typescript [Server (Native)]
import { handler } from '@adi-family/http'
import { serveNative } from '@adi-family/http-native'
import { getUserConfig } from './contracts'

const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)
  return user
})

serveNative([getUserHandler], { port: 3000 })
```

```typescript [Client]
import { BaseClient } from '@adi-family/http'
import { getUserConfig } from './contracts'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

// Fully type-safe!
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})

console.log(user.name) // TypeScript knows this exists!
```

:::

## Installation

::: code-group

```bash [npm]
# Core library
npm install @adi-family/http zod

# Framework adapters
npm install @adi-family/http-express  # For Express
npm install @adi-family/http-native   # For Native Node.js
```

```bash [bun]
# Core library
bun add @adi-family/http zod

# Framework adapters
bun add @adi-family/http-express  # For Express
bun add @adi-family/http-native   # For Native Node.js
```

```bash [pnpm]
# Core library
pnpm add @adi-family/http zod

# Framework adapters
pnpm add @adi-family/http-express  # For Express
pnpm add @adi-family/http-native   # For Native Node.js
```

:::

## Why @adi-family/http?

<div class="tip custom-block">
  <strong>vs tRPC</strong>: Standard HTTP/REST instead of custom protocol. Works with any client, not just TypeScript.
</div>

<div class="tip custom-block">
  <strong>vs Hono</strong>: Framework-independent. Not locked to specific runtime or framework. Cleaner contract separation.
</div>

<div class="tip custom-block">
  <strong>vs Raw Express</strong>: Type-safe end-to-end. Automatic validation. Share contracts between client and server. DRY principle.
</div>

## What's Next?

<div class="vp-link-grid">
  <a href="/http/guide/getting-started" class="vp-link-grid-item">
    <h3>📚 Get Started</h3>
    <p>Learn the basics and create your first type-safe API</p>
  </a>

  <a href="/http/guide/route-builder" class="vp-link-grid-item">
    <h3>🎨 Route Builder</h3>
    <p>Master the powerful route builder API</p>
  </a>

  <a href="/http/examples/basic" class="vp-link-grid-item">
    <h3>💡 Examples</h3>
    <p>Explore practical examples and patterns</p>
  </a>

  <a href="/http/guide/llm" class="vp-link-grid-item">
    <h3>🤖 LLM Reference</h3>
    <p>Quick reference guide for AI assistants</p>
  </a>
</div>

<style>
.vp-link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.vp-link-grid-item {
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s;
}

.vp-link-grid-item:hover {
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.vp-link-grid-item h3 {
  margin-top: 0;
  color: var(--vp-c-brand);
}

.vp-link-grid-item p {
  margin-bottom: 0;
  color: var(--vp-c-text-2);
}
</style>

# What is @adi-family/http?

@adi-family/http is a framework-agnostic, type-safe HTTP interface system that separates API contracts from implementation, enabling end-to-end type safety between client and server.

## The Problem

Modern web applications face several challenges when building APIs:

- **Type safety gaps** - Types defined on the server don't automatically flow to the client
- **Validation duplication** - You validate data on both client and server separately
- **Framework lock-in** - Switching frameworks means rewriting your entire API
- **Maintenance burden** - API changes require updates in multiple places
- **Client-server drift** - Client and server can easily get out of sync

## The Solution

@adi-family/http solves these problems through:

### 1. Config-Based Contracts

Define your API once as a configuration object:

```typescript
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

export const getUserConfig = {
  method: 'GET',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    })
  }
} as const satisfies HandlerConfig
```

This config is your **single source of truth** - shared between client and server.

### 2. Framework Independence

Use any HTTP framework on the server:

```typescript
// Express
import { serveExpress } from '@adi-family/http-express'
serveExpress(app, [getUserHandler])

// Native Node.js HTTP
import { serveNative } from '@adi-family/http-native'
serveNative([getUserHandler], { port: 3000 })

// Future: Hono, Fastify, etc.
```

### 3. End-to-End Type Safety

TypeScript infers all types from your config:

```typescript
// Server
export const getUserHandler = handler(getUserConfig, async (ctx) => {
  // ctx.params.id is automatically typed as string
  const user = await db.users.findById(ctx.params.id)
  return user // Must match response schema
})

// Client
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})
// user.name is automatically typed as string
// user.email is automatically typed as string
// user.unknown would be a TypeScript error
```

### 4. Automatic Validation

Zod schemas validate data on both client and server:

```typescript
export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(18)
    })
  }
} as const satisfies HandlerConfig

// Invalid data is caught automatically:
await client.run(createUserConfig, {
  body: {
    name: '',  // ❌ Validation error: min 1 character
    email: 'not-an-email',  // ❌ Validation error: invalid email
    age: 15  // ❌ Validation error: must be >= 18
  }
})
```

## Architecture

```
┌─────────────────┐
│  @api-contracts │  ← Shared configs (single source of truth)
│   (configs only)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│Client │ │Server │
│       │ │       │
└───────┘ └───────┘
```

**Key principle:** Contracts live separately from both client and server implementations.

## Core Concepts

### Handler Config

The config defines:
- **Method** - HTTP method (GET, POST, PUT, PATCH, DELETE)
- **Route** - URL pattern (static, pattern, or custom)
- **Query** - Optional query parameters with Zod schema
- **Body** - Optional request body with Zod schema
- **Response** - Optional response schema for validation

### Handlers

Server-side functions that implement the business logic:

```typescript
import { handler } from '@adi-family/http'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  // Your business logic here
  return await db.users.findById(ctx.params.id)
})
```

### Client

Type-safe HTTP client that uses configs:

```typescript
import { BaseClient } from '@adi-family/http'

const client = new BaseClient({ baseUrl: 'http://localhost:3000' })

const user = await client.run(getUserConfig, {
  params: { id: '123' }
})
```

## What Makes It Different?

### vs tRPC
- **REST-based** - Works with any HTTP client, not just TypeScript
- **Framework agnostic** - Use Express, Hono, Fastify, or native HTTP
- **Simpler** - No complex router setup or procedure types

### vs Hono RPC
- **Truly framework independent** - Not locked to Hono
- **Cleaner separation** - Configs are pure data, no framework coupling
- **Better contracts** - Explicit config objects instead of chained methods

### vs Raw Express/Fastify
- **Type safety** - Full end-to-end TypeScript inference
- **Automatic validation** - Zod validates automatically
- **DRY principle** - Share contracts between client and server
- **Maintainability** - Changes propagate automatically

## Use Cases

Perfect for:

- **Monorepos** - Share contracts between frontend and backend packages
- **API-first development** - Define contracts before implementation
- **Type-safe APIs** - Ensure client and server stay in sync
- **Framework migration** - Switch frameworks without rewriting contracts
- **Multi-client APIs** - Same contracts for web, mobile, desktop clients

## Next Steps

- **[Why Use It?](/guide/why)** - Deeper dive into benefits and comparisons
- **[Getting Started](/guide/getting-started)** - Build your first API
- **[Route Builder](/guide/route-builder)** - Learn about routing
- **[Examples](/examples/basic)** - See practical examples

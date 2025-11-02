# LLM Quick Reference

Ultra-concise guide for AI assistants implementing @adi-family/http.

## Core Pattern

```typescript
// 1. Define contract
import { route } from '@adi-family/http'
import { z } from 'zod'

export const getUserConfig = {
  method: 'GET',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() })),
  response: { schema: z.object({ id: z.string(), name: z.string() }) }
} as const satisfies HandlerConfig

// 2. Implement handler
import { handler } from '@adi-family/http'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  return await db.users.findById(ctx.params.id)
})

// 3. Serve
import { serveExpress } from '@adi-family/http-express'
serveExpress(app, [getUserHandler])

// 4. Use client
import { BaseClient } from '@adi-family/http'
const client = new BaseClient({ baseUrl: 'http://localhost:3000' })
const user = await client.run(getUserConfig, { params: { id: '123' } })
```

## Routes

```typescript
// Static route
route.static('/api/users')

// Pattern route (Express-style)
route.pattern('/api/users/:id', z.object({ id: z.string() }))

// Nested params
route.pattern('/api/orgs/:orgId/projects/:projectId',
  z.object({ orgId: z.string(), projectId: z.string() })
)

// Custom route
route.custom({
  params: z.object({ lat: z.number(), lng: z.number() }),
  build: (p) => `/geo/${p.lat},${p.lng}`,
  parse: (url) => {
    const [lat, lng] = url.pathname.split('/').pop()!.split(',').map(Number)
    return { lat, lng }
  },
  is: (url) => /^\/geo\/[\d.]+,[\d.]+$/.test(url.pathname)
})
```

## HandlerConfig Fields

```typescript
interface HandlerConfig<TParams, TQuery, TBody, TResponse> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'  // Default: GET
  route: RouteConfig<TParams>                            // Required
  query?: { schema: ZodSchema<TQuery> }                  // Optional
  body?: { schema: ZodSchema<TBody> }                    // Optional
  response?: { schema: ZodSchema<TResponse> }            // Optional
}
```

## Common Patterns

### GET with query params
```typescript
{
  method: 'GET',
  route: route.static('/api/users'),
  query: { schema: z.object({ page: z.number(), limit: z.number() }) }
}
```

### POST with body
```typescript
{
  method: 'POST',
  route: route.static('/api/users'),
  body: { schema: z.object({ name: z.string(), email: z.string() }) }
}
```

### DELETE with params
```typescript
{
  method: 'DELETE',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() }))
}
```

## Handler Context

```typescript
handler(config, async (ctx) => {
  ctx.params   // URL params (validated by route schema)
  ctx.query    // Query params (validated by query schema)
  ctx.body     // Request body (validated by body schema)
  ctx.headers  // Headers object
  ctx.raw      // Framework-specific request
})
```

## Validation

- **Route params**: Validated by `route.pattern()` or `route.custom()` schema
- **Query**: Validated by `query.schema`
- **Body**: Validated by `body.schema`
- **Response**: Validated by `response.schema` (optional)

All validation uses Zod schemas.

## File Organization

```
contracts/users.ts      → Export configs only
handlers/users.ts       → Import configs, add handler logic
client/users.ts         → Import configs, use with BaseClient
```

## Type Safety

```typescript
// Type inference works automatically
const config = {
  route: route.pattern('/users/:id', z.object({ id: z.string() })),
  response: { schema: z.object({ name: z.string() }) }
} as const satisfies HandlerConfig

// Client knows param and response types
const user = await client.run(config, { params: { id: '123' } })
user.name // ✓ TypeScript knows this exists
```

## Adapters

```typescript
// Express
import { serveExpress } from '@adi-family/http-express'
serveExpress(app, [handler1, handler2])

// Native HTTP
import { serveNative } from '@adi-family/http-native'
serveNative([handler1, handler2], { port: 3000 })
```

## Key Rules

1. Always use `route.static()` or `route.pattern()` (never old `url`/`params` fields)
2. Contracts are pure config objects (export as `const satisfies HandlerConfig`)
3. Route params are validated by schema in `route.pattern()`
4. Query and body need explicit `{ schema: ... }` for validation
5. Use `as const satisfies HandlerConfig` for type inference

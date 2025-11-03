# Why Use @adi-family/http?

Understanding why @adi-family/http was built and when to use it.

## The Core Problem

When building full-stack TypeScript applications, you typically face these challenges:

### 1. Type Safety Breaks at the API Boundary

```typescript
// Server (backend/api/users.ts)
interface User {
  id: string
  name: string
  email: string
}

app.get('/api/users/:id', async (req, res) => {
  const user: User = await db.users.findById(req.params.id)
  res.json(user)
})

// Client (frontend/api/users.ts)
interface User {  // ❌ Duplicate definition!
  id: string
  name: string
  email: string
}

async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  return response.json() as User  // ❌ Type assertion - no validation!
}
```

**Problems:**
- Types defined twice (DRY violation)
- No compile-time guarantee they match
- No runtime validation
- Easy to drift apart over time

### 2. Validation Duplication

```typescript
// Server validation
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

// Client validation - different!
const clientSchema = z.object({
  name: z.string(),  // ❌ Missing .min(1)
  email: z.string()  // ❌ Missing .email()
})
```

### 3. Framework Lock-In

```typescript
// Tightly coupled to Express
app.post('/api/users', express.json(), (req, res) => {
  // Business logic mixed with Express specifics
  res.status(201).json({ id: user.id })
})

// Want to switch to Fastify? Rewrite everything!
```

## How @adi-family/http Solves These

### 1. Single Source of Truth

```typescript
// packages/api-contracts/users.ts
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

// ✅ One definition
// ✅ Used by both client and server
// ✅ Types inferred automatically
// ✅ Validation happens automatically
```

### 2. Automatic Type Inference

```typescript
// Server - types inferred from config
export const getUserHandler = handler(getUserConfig, async (ctx) => {
  // ctx.params.id is typed as string (from config)
  const user = await db.users.findById(ctx.params.id)

  // ✅ TypeScript ensures return matches response schema
  return user
})

// Client - types inferred from config
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})
// ✅ user.name is typed as string
// ✅ user.email is typed as string
// ✅ user.unknown would be a TypeScript error
```

### 3. Framework Independence

```typescript
// Same handler works with any framework

// Express
import { serveExpress } from '@adi-family/http-express'
serveExpress(app, [getUserHandler])

// Native HTTP
import { serveNative } from '@adi-family/http-native'
serveNative([getUserHandler])

// Future: Hono, Fastify, etc.
// Business logic stays the same!
```

## Comparison with Alternatives

### vs tRPC

**tRPC strengths:**
- Excellent TypeScript integration
- Subscriptions support
- Mature ecosystem

**@adi-family/http advantages:**
- ✅ **REST-based** - Works with any HTTP client (curl, Postman, mobile apps)
- ✅ **Framework agnostic** - Not locked to specific server framework
- ✅ **Simpler** - No complex router setup or procedure types
- ✅ **Standard HTTP** - Uses standard REST patterns developers know

**When to use tRPC:**
- TypeScript-only full-stack app
- Need real-time subscriptions
- Team already familiar with tRPC

**When to use @adi-family/http:**
- Need REST APIs for non-TypeScript clients
- Want framework flexibility
- Prefer explicit contracts over inferred types
- Building public APIs

### vs Hono RPC

**Hono RPC strengths:**
- Tight Hono integration
- Fast performance
- Good TypeScript support

**@adi-family/http advantages:**
- ✅ **Truly framework independent** - Not locked to Hono
- ✅ **Cleaner separation** - Contracts are pure data objects
- ✅ **Better testability** - Configs can be tested independently
- ✅ **No framework coupling** - Business logic separate from routing

**Example comparison:**

```typescript
// Hono RPC - coupled to Hono
const app = new Hono()
  .get('/users/:id', zValidator('param', schema), (c) => {
    // Logic mixed with Hono context
    return c.json(user)
  })

// @adi-family/http - decoupled
export const getUserConfig = {
  method: 'GET',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() }))
} as const satisfies HandlerConfig

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  // Pure business logic, no framework
  return await db.users.findById(ctx.params.id)
})
```

### vs Raw Express/Fastify

**Express/Fastify strengths:**
- Mature ecosystems
- Large community
- Lots of middleware

**@adi-family/http advantages:**
- ✅ **Type safety** - Full end-to-end TypeScript inference
- ✅ **Automatic validation** - Zod validates body and query automatically
- ✅ **DRY principle** - No duplicate definitions
- ✅ **Client generation** - Type-safe client from same configs
- ✅ **Maintainability** - Changes propagate automatically

**You can use both!** @adi-family/http adapters work with Express:

```typescript
import express from 'express'
import { serveExpress } from '@adi-family/http-express'

const app = express()

// Use Express middleware as usual
app.use(cors())
app.use(helmet())

// Add type-safe routes
serveExpress(app, [getUserHandler, createUserHandler])

// Still use Express for other routes
app.get('/health', (req, res) => res.json({ ok: true }))
```

## When to Use @adi-family/http

### Perfect For:

#### Monorepos
```
your-project/
├── packages/
│   ├── api-contracts/    # Shared configs
│   ├── backend/          # Server
│   ├── web/              # Web client
│   └── mobile/           # Mobile client
```

All packages import the same contracts - guaranteed sync.

#### API-First Development

1. Define contracts first
2. Frontend and backend teams work in parallel
3. Both use the same type-safe contracts
4. No integration surprises

#### Type-Safe APIs

```typescript
// Impossible to have mismatched types
// TypeScript enforces contract adherence
export const handler = handler(config, async (ctx) => {
  // Must return data matching response schema
  return { id: '123', name: 'Alice' }  // ✅
  return { id: 123 }  // ❌ TypeScript error
})
```

#### Framework Migration

```typescript
// Today: Express
serveExpress(app, handlers)

// Tomorrow: Switch to native HTTP
serveNative(handlers)

// Next week: Try Hono
// Business logic and contracts unchanged!
```

#### Multi-Client APIs

Same contracts work for:
- Web applications
- Mobile apps
- Desktop applications
- CLI tools
- Third-party integrations

### Not Ideal For:

- **GraphQL APIs** - Use Apollo or similar
- **Real-time apps** - Use tRPC with subscriptions or Socket.io
- **Simple CRUD apps** - Raw Express might be simpler
- **Non-TypeScript projects** - This is TypeScript-first

## Real-World Benefits

### Type Safety

```typescript
// Compile-time errors prevent runtime bugs
const user = await client.run(getUserConfig, {
  params: { id: 123 }  // ❌ TypeScript error: id must be string
})

console.log(user.name)  // ✅ TypeScript knows this exists
console.log(user.age)   // ❌ TypeScript error: property doesn't exist
```

### Refactoring Safety

```typescript
// Change response schema
export const getUserConfig = {
  // ...
  response: {
    schema: z.object({
      id: z.string(),
      fullName: z.string(),  // Renamed from 'name'
      email: z.string()
    })
  }
} as const satisfies HandlerConfig

// ✅ TypeScript errors appear everywhere 'name' was used
// ✅ Change once, update everywhere
```

### Documentation

```typescript
// Configs self-document the API
export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().min(18).optional()
    }).describe('User creation payload')
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      createdAt: z.string().datetime()
    }).describe('Created user')
  }
} as const satisfies HandlerConfig

// Generate OpenAPI specs from configs (future feature)
```

### Testing

```typescript
// Test configs independently
import { getUserConfig } from '@api-contracts/users'

test('getUserConfig has correct route', () => {
  expect(getUserConfig.route.pattern).toBe('/api/users/:id')
})

// Test handlers with mocked dependencies
test('getUserHandler returns user', async () => {
  const handler = getUserHandler
  const result = await handler.execute({
    params: { id: '123' },
    // ...
  })
  expect(result.name).toBe('Alice')
})

// Test client integration
test('client calls correct endpoint', async () => {
  const client = new BaseClient({ baseUrl: 'http://test' })
  await client.run(getUserConfig, { params: { id: '123' } })
  // Assert fetch was called with correct URL
})
```

## Getting Started

Ready to try it? Check out:

- **[Getting Started](/guide/getting-started)** - Build your first API
- **[Examples](/examples/basic)** - See practical examples
- **[Migration Guide](/examples/migration)** - Migrate from existing solutions

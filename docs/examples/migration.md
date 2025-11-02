# Migration from Hono

This guide helps you migrate from Hono to @adi-family/http, highlighting the key differences and showing equivalent patterns.

## Why Migrate?

While Hono is excellent, @adi-family/http offers:

- **Framework Independence** - Works with Express, Native HTTP, or any framework
- **Stronger Type Safety** - Config-based contracts shared between client and server
- **Contract Separation** - API definitions are pure config objects, not tied to implementation
- **DRY Principle** - Single source of truth for routes, no build/pattern duplication
- **Client Generation** - Type-safe client automatically from configs

## Key Differences

| Feature | Hono | @adi-family/http |
|---------|------|------------------|
| Runtime | Edge-first, Cloudflare Workers | Framework-agnostic, any runtime |
| API Style | Method chaining | Config-based contracts |
| Type Safety | Inferred from handlers | Inferred from configs |
| Client | Manual or generated | Built-in type-safe client |
| Validation | Hono validator | Zod (customizable) |
| Route Definition | Inline with handler | Separate config |

## Migration Examples

### 1. Basic Route

**Hono:**

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/api/users/:id', (c) => {
  const id = c.req.param('id')
  const user = db.users.get(id)
  return c.json(user)
})
```

**@adi-family/http:**

```typescript
import { route } from '@adi-family/http'
import { handler } from '@adi-family/http'
import { z } from 'zod'

// 1. Define contract
export const getUserConfig = {
  method: 'GET',
  route: route.dynamic('/api/users/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string()
    })
  }
} as const

// 2. Implement handler
export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = db.users.get(ctx.params.id)
  return user
})

// 3. Register with Express
serveExpress(app, [getUserHandler])
```

### 2. Request Validation

**Hono:**

```typescript
import { zValidator } from '@hono/zod-validator'

app.post(
  '/api/users',
  zValidator('json', z.object({
    name: z.string(),
    email: z.string().email()
  })),
  async (c) => {
    const data = c.req.valid('json')
    const user = await db.users.create(data)
    return c.json(user)
  }
)
```

**@adi-family/http:**

```typescript
export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string(),
      email: z.string().email()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    })
  }
} as const

export const createUserHandler = handler(createUserConfig, async (ctx) => {
  // ctx.body is already validated
  const user = await db.users.create(ctx.body)
  return user
})
```

### 3. Query Parameters

**Hono:**

```typescript
app.get('/api/users', (c) => {
  const page = Number(c.req.query('page') || '1')
  const limit = Number(c.req.query('limit') || '10')

  const users = db.users.paginate(page, limit)
  return c.json(users)
})
```

**@adi-family/http:**

```typescript
export const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users'),
  query: {
    schema: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10)
    })
  },
  response: {
    schema: z.object({
      data: z.array(z.object({
        id: z.string(),
        name: z.string()
      })),
      total: z.number()
    })
  }
} as const

export const listUsersHandler = handler(listUsersConfig, async (ctx) => {
  // ctx.query is already validated and has correct types
  const users = db.users.paginate(ctx.query.page, ctx.query.limit)
  return users
})
```

### 4. Middleware

**Hono:**

```typescript
import { createMiddleware } from 'hono/factory'

const authMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('user', verifyToken(token))
  await next()
})

app.use('/api/protected/*', authMiddleware)

app.get('/api/protected/data', (c) => {
  const user = c.get('user')
  return c.json({ data: user })
})
```

**@adi-family/http:**

```typescript
// Handle auth in handler
export const getProtectedDataConfig = {
  method: 'GET',
  route: route.static('/api/protected/data')
} as const

export const getProtectedDataHandler = handler(getProtectedDataConfig, async (ctx) => {
  const token = ctx.headers.get('Authorization')
  if (!token) {
    throw new Error('Unauthorized')
  }

  const user = verifyToken(token)
  return { data: user }
})

// Or use Express middleware
app.use('/api/protected/*', authMiddleware)
serveExpress(app, [getProtectedDataHandler])
```

### 5. Nested Routes

**Hono:**

```typescript
const api = new Hono()

api.get('/users/:userId/posts/:postId', (c) => {
  const userId = c.req.param('userId')
  const postId = c.req.param('postId')
  const post = db.posts.find(userId, postId)
  return c.json(post)
})

app.route('/api', api)
```

**@adi-family/http:**

```typescript
export const getUserPostConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/users/:userId/posts/:postId',
    z.object({
      userId: z.string(),
      postId: z.string()
    })
  ),
  response: {
    schema: z.object({
      id: z.string(),
      title: z.string(),
      userId: z.string()
    })
  }
} as const

export const getUserPostHandler = handler(getUserPostConfig, async (ctx) => {
  const post = db.posts.find(ctx.params.userId, ctx.params.postId)
  return post
})
```

### 6. Error Handling

**Hono:**

```typescript
app.onError((err, c) => {
  console.error(err)

  if (err.message === 'Not found') {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json({ error: 'Internal server error' }, 500)
})
```

**@adi-family/http:**

```typescript
// Express error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err)

  if (err.message === 'Not found') {
    return res.status(404).json({ error: 'Not found' })
  }

  res.status(500).json({ error: 'Internal server error' })
})
```

## Step-by-Step Migration

### Step 1: Install Dependencies

```bash
npm uninstall hono
npm install @adi-family/http @adi-family/http-express zod
```

### Step 2: Create Contracts Directory

```bash
mkdir contracts
```

### Step 3: Convert Routes to Configs

For each Hono route:

1. Extract route pattern and params
2. Extract validation schemas
3. Create a config object
4. Move handler logic to handler function

**Before (Hono):**

```typescript
app.post(
  '/api/posts',
  zValidator('json', z.object({
    title: z.string(),
    content: z.string()
  })),
  async (c) => {
    const data = c.req.valid('json')
    const post = await db.posts.create(data)
    return c.json(post)
  }
)
```

**After (@adi-family/http):**

```typescript
// contracts/posts.ts
export const createPostConfig = {
  method: 'POST',
  route: route.static('/api/posts'),
  body: {
    schema: z.object({
      title: z.string(),
      content: z.string()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      title: z.string(),
      content: z.string()
    })
  }
} as const

// handlers/posts.ts
export const createPostHandler = handler(createPostConfig, async (ctx) => {
  const post = await db.posts.create(ctx.body)
  return post
})
```

### Step 4: Update Server Setup

**Before (Hono):**

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

// ... routes ...

serve(app)
```

**After (@adi-family/http with Express):**

```typescript
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { createPostHandler } from './handlers/posts'

const app = express()
app.use(express.json())

serveExpress(app, [createPostHandler])

app.listen(3000)
```

**Or with Native HTTP:**

```typescript
import { serveNative } from '@adi-family/http-native'
import { createPostHandler } from './handlers/posts'

serveNative([createPostHandler], { port: 3000 })
```

### Step 5: Create Type-Safe Client

This is where @adi-family/http shines - you get a type-safe client for free:

```typescript
import { BaseClient } from '@adi-family/http'
import { createPostConfig, getPostConfig } from './contracts/posts'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

// Fully type-safe!
const post = await client.run(createPostConfig, {
  body: {
    title: 'My Post',
    content: 'Hello world'
  }
})

console.log(post.id) // TypeScript knows this exists
```

## Complete Migration Example

### Before: Hono App

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

// Get users
app.get('/api/users', (c) => {
  const users = db.users.getAll()
  return c.json(users)
})

// Get user
app.get('/api/users/:id', (c) => {
  const user = db.users.get(c.req.param('id'))
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }
  return c.json(user)
})

// Create user
app.post(
  '/api/users',
  zValidator('json', z.object({
    name: z.string(),
    email: z.string().email()
  })),
  async (c) => {
    const data = c.req.valid('json')
    const user = await db.users.create(data)
    return c.json(user, 201)
  }
)

export default app
```

### After: @adi-family/http

```typescript
// contracts/users.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
})

export const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users'),
  response: {
    schema: z.array(userSchema)
  }
} as const satisfies HandlerConfig

export const getUserConfig = {
  method: 'GET',
  route: route.dynamic('/api/users/:id', z.object({ id: z.string() })),
  response: {
    schema: userSchema
  }
} as const satisfies HandlerConfig

export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string(),
      email: z.string().email()
    })
  },
  response: {
    schema: userSchema
  }
} as const satisfies HandlerConfig

// handlers/users.ts
import { handler } from '@adi-family/http'
import { listUsersConfig, getUserConfig, createUserConfig } from '../contracts/users'

export const listUsersHandler = handler(listUsersConfig, async () => {
  return db.users.getAll()
})

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = db.users.get(ctx.params.id)
  if (!user) {
    throw new Error('User not found')
  }
  return user
})

export const createUserHandler = handler(createUserConfig, async (ctx) => {
  return await db.users.create(ctx.body)
})

// server.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { listUsersHandler, getUserHandler, createUserHandler } from './handlers/users'

const app = express()
app.use(express.json())

serveExpress(app, [
  listUsersHandler,
  getUserHandler,
  createUserHandler
])

app.listen(3000)
```

## Benefits After Migration

### 1. Share Contracts with Frontend

```typescript
// Frontend can import the same contracts
import { getUserConfig } from '@your-org/contracts'
import { BaseClient } from '@adi-family/http'

const client = new BaseClient({ baseUrl: 'https://api.example.com' })
const user = await client.run(getUserConfig, { params: { id: '123' } })
```

### 2. Framework Independence

Switch frameworks without changing contracts:

```typescript
// From Express
serveExpress(app, handlers)

// To Native HTTP
serveNative(handlers, { port: 3000 })

// Contracts and handlers unchanged!
```

### 3. Better Type Safety

Types flow from config to everything:

```typescript
type UserResponse = InferResponse<typeof getUserConfig>
type CreateUserBody = InferBody<typeof createUserConfig>
```

## Troubleshooting

### Issue: Missing Context Properties

**Hono:** `c.req`, `c.res`, `c.set()`, `c.get()`

**Solution:** Use `ctx.params`, `ctx.query`, `ctx.body`, `ctx.headers`, or `ctx.raw` for framework-specific access.

### Issue: Middleware Not Working

**Solution:** Use Express middleware directly or implement in handlers.

### Issue: Response Status Codes

**Hono:** `return c.json(data, 201)`

**Solution:** Use Express response object via error handling middleware or return errors.

## Next Steps

- [Basic Examples](/examples/basic) - Learn the basics
- [Advanced Examples](/examples/advanced) - Complex patterns
- [Handlers Guide](/guide/handlers) - Deep dive into handlers
- [Client Guide](/guide/client) - Using the type-safe client

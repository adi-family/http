# Middleware

Add custom middleware to your handlers for cross-cutting concerns like authentication, logging, and request transformation.

## Handler Middleware

Middleware in @adi-family/http is defined at the handler level, not globally. This gives you fine-grained control over which handlers use which middleware.

## Basic Middleware

A middleware is an async function that receives the context and a `next` function:

```typescript
import type { HandlerContext } from '@adi-family/http'

async function myMiddleware(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  // Before handler execution
  console.log('Before handler')

  // Execute the handler
  const result = await next()

  // After handler execution
  console.log('After handler')

  return result
}
```

## Adding Middleware to Handlers

Add middleware via the handler config:

```typescript
import { handler } from '@adi-family/http'

export const getUserHandler = handler(
  {
    ...getUserConfig,
    middleware: [authMiddleware, loggingMiddleware]
  },
  async (ctx) => {
    return await db.users.findById(ctx.params.id)
  }
)
```

Middleware executes in order: first to last before the handler, last to first after.

## Common Middleware Patterns

### Authentication

Verify user authentication:

```typescript
// middleware/auth.ts
import type { HandlerContext } from '@adi-family/http'

export async function requireAuth(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  const authHeader = ctx.headers.get('Authorization')

  if (!authHeader) {
    throw new Error('Unauthorized: No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  // Verify token
  const user = await verifyToken(token)

  if (!user) {
    throw new Error('Unauthorized: Invalid token')
  }

  // Add user to context (extend context type as needed)
  ;(ctx as any).user = user

  return next()
}

// Usage
export const getProfileHandler = handler(
  {
    ...getProfileConfig,
    middleware: [requireAuth]
  },
  async (ctx) => {
    const user = (ctx as any).user
    return await db.users.findById(user.id)
  }
)
```

### Authorization

Check user permissions:

```typescript
// middleware/authorize.ts
export function requireRole(...roles: string[]) {
  return async (ctx: HandlerContext<any, any, any>, next: () => Promise<any>) => {
    const user = (ctx as any).user

    if (!user) {
      throw new Error('Unauthorized')
    }

    if (!roles.includes(user.role)) {
      throw new Error(`Forbidden: Requires one of: ${roles.join(', ')}`)
    }

    return next()
  }
}

// Usage
export const deleteUserHandler = handler(
  {
    ...deleteUserConfig,
    middleware: [requireAuth, requireRole('admin', 'moderator')]
  },
  async (ctx) => {
    await db.users.delete(ctx.params.id)
    return { success: true }
  }
)
```

### Request Logging

Log all requests:

```typescript
// middleware/logging.ts
export async function requestLogger(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  const start = Date.now()

  console.log(`[${new Date().toISOString()}] Request started`)

  try {
    const result = await next()
    const duration = Date.now() - start

    console.log(`[${new Date().toISOString()}] Request completed in ${duration}ms`)

    return result
  } catch (error) {
    const duration = Date.now() - start

    console.error(`[${new Date().toISOString()}] Request failed in ${duration}ms:`, error)

    throw error
  }
}
```

### Rate Limiting

Limit request rate per user or IP:

```typescript
// middleware/rate-limit.ts
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(maxRequests: number, windowMs: number) {
  return async (ctx: HandlerContext<any, any, any>, next: () => Promise<any>) => {
    const ip = ctx.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()

    const record = requestCounts.get(ip)

    if (!record || now > record.resetAt) {
      // Start new window
      requestCounts.set(ip, {
        count: 1,
        resetAt: now + windowMs
      })
    } else {
      // Increment count
      record.count++

      if (record.count > maxRequests) {
        throw new Error('Too many requests')
      }
    }

    return next()
  }
}

// Usage: 100 requests per 15 minutes
export const createUserHandler = handler(
  {
    ...createUserConfig,
    middleware: [rateLimit(100, 15 * 60 * 1000)]
  },
  async (ctx) => {
    return await db.users.create(ctx.body)
  }
)
```

### Request Validation

Additional validation beyond Zod schemas:

```typescript
// middleware/validate-id.ts
export async function validateUUID(
  ctx: HandlerContext<{ id: string }, any, any>,
  next: () => Promise<any>
) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(ctx.params.id)) {
    throw new Error('Invalid UUID format')
  }

  return next()
}

// Usage
export const getUserHandler = handler(
  {
    ...getUserConfig,
    middleware: [validateUUID]
  },
  async (ctx) => {
    return await db.users.findById(ctx.params.id)
  }
)
```

### Request Transformation

Transform request data before handler:

```typescript
// middleware/normalize.ts
export async function normalizeEmail(
  ctx: HandlerContext<any, any, { email: string }>,
  next: () => Promise<any>
) {
  if (ctx.body?.email) {
    ctx.body.email = ctx.body.email.toLowerCase().trim()
  }

  return next()
}

// Usage
export const createUserHandler = handler(
  {
    ...createUserConfig,
    middleware: [normalizeEmail]
  },
  async (ctx) => {
    // ctx.body.email is now normalized
    return await db.users.create(ctx.body)
  }
)
```

### Response Transformation

Transform response data after handler:

```typescript
// middleware/sanitize.ts
export async function sanitizeUser(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  const result = await next()

  // Remove sensitive fields
  if (result && typeof result === 'object') {
    const { password, internalId, ...sanitized } = result
    return sanitized
  }

  return result
}

// Usage
export const getUserHandler = handler(
  {
    ...getUserConfig,
    middleware: [sanitizeUser]
  },
  async (ctx) => {
    return await db.users.findById(ctx.params.id)
    // password and internalId will be removed
  }
)
```

### Caching

Cache responses:

```typescript
// middleware/cache.ts
const cache = new Map<string, { data: any; expiresAt: number }>()

export function cacheResponse(ttlSeconds: number) {
  return async (ctx: HandlerContext<any, any, any>, next: () => Promise<any>) => {
    // Build cache key from URL
    const cacheKey = ctx.url.toString()
    const now = Date.now()

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && now < cached.expiresAt) {
      console.log('Cache hit:', cacheKey)
      return cached.data
    }

    // Execute handler
    const result = await next()

    // Store in cache
    cache.set(cacheKey, {
      data: result,
      expiresAt: now + ttlSeconds * 1000
    })

    return result
  }
}

// Usage: cache for 5 minutes
export const listUsersHandler = handler(
  {
    ...listUsersConfig,
    middleware: [cacheResponse(300)]
  },
  async (ctx) => {
    return await db.users.findAll()
  }
)
```

### Error Enrichment

Add context to errors:

```typescript
// middleware/error-context.ts
export async function addErrorContext(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  try {
    return await next()
  } catch (error) {
    // Add context to error
    if (error instanceof Error) {
      (error as any).context = {
        url: ctx.url.toString(),
        params: ctx.params,
        timestamp: new Date().toISOString()
      }
    }
    throw error
  }
}
```

## Composing Middleware

Create reusable middleware stacks:

```typescript
// middleware/stacks.ts
export const publicRoute = []

export const authenticatedRoute = [
  requireAuth,
  requestLogger
]

export const adminRoute = [
  requireAuth,
  requireRole('admin'),
  requestLogger
]

// Usage
export const getUserHandler = handler(
  {
    ...getUserConfig,
    middleware: authenticatedRoute
  },
  async (ctx) => {
    return await db.users.findById(ctx.params.id)
  }
)

export const deleteUserHandler = handler(
  {
    ...deleteUserConfig,
    middleware: adminRoute
  },
  async (ctx) => {
    await db.users.delete(ctx.params.id)
    return { success: true }
  }
)
```

## Middleware Order

Middleware executes in this order:

```typescript
handler(
  {
    ...config,
    middleware: [middleware1, middleware2, middleware3]
  },
  async (ctx) => {
    // Handler
  }
)

// Execution flow:
// 1. middleware1 (before)
// 2. middleware2 (before)
// 3. middleware3 (before)
// 4. Handler
// 5. middleware3 (after)
// 6. middleware2 (after)
// 7. middleware1 (after)
```

This is useful for response transformation:

```typescript
handler(
  {
    ...config,
    middleware: [
      authMiddleware,      // Validate auth first
      loggingMiddleware,   // Log request
      sanitizeMiddleware   // Clean response last
    ]
  },
  async (ctx) => { /* ... */ }
)
```

## Typed Middleware

For better TypeScript support, create typed middleware:

```typescript
// types/context.ts
export interface AuthContext<TParams, TQuery, TBody>
  extends HandlerContext<TParams, TQuery, TBody> {
  user: {
    id: string
    email: string
    role: string
  }
}

// middleware/auth.ts
export async function requireAuth(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
): Promise<any> {
  const authHeader = ctx.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Unauthorized')
  }

  const user = await verifyToken(authHeader.replace('Bearer ', ''))
  ;(ctx as any).user = user

  return next()
}

// Usage with type assertion
export const getProfileHandler = handler(
  {
    ...getProfileConfig,
    middleware: [requireAuth]
  },
  async (ctx) => {
    const authCtx = ctx as AuthContext<typeof ctx.params, typeof ctx.query, typeof ctx.body>
    // authCtx.user is now typed
    return await db.users.findById(authCtx.user.id)
  }
)
```

## Best Practices

### 1. Keep Middleware Focused

Each middleware should do one thing:

```typescript
// ✅ Good - focused
const authMiddleware = async (ctx, next) => {
  await verifyAuth(ctx)
  return next()
}

// ❌ Bad - doing too much
const megaMiddleware = async (ctx, next) => {
  await verifyAuth(ctx)
  await checkPermissions(ctx)
  await logRequest(ctx)
  await validateData(ctx)
  return next()
}
```

### 2. Order Matters

Put authentication before authorization:

```typescript
// ✅ Correct order
middleware: [requireAuth, requireRole('admin'), logRequest]

// ❌ Wrong order
middleware: [requireRole('admin'), requireAuth]  // Will fail
```

### 3. Handle Errors Properly

Always propagate errors:

```typescript
// ✅ Good
const middleware = async (ctx, next) => {
  try {
    return await next()
  } catch (error) {
    // Add context, then re-throw
    console.error('Handler failed:', error)
    throw error
  }
}

// ❌ Bad - swallowing errors
const middleware = async (ctx, next) => {
  try {
    return await next()
  } catch (error) {
    return { error: 'Something went wrong' }  // Don't do this
  }
}
```

### 4. Use Middleware Stacks

Create reusable middleware combinations:

```typescript
const standardRoute = [requestLogger, errorHandler]
const authenticatedRoute = [...standardRoute, requireAuth]
const adminRoute = [...authenticatedRoute, requireRole('admin')]
```

## Framework-Specific Middleware

### Express Middleware

When using the Express adapter, you can use Express middleware globally:

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { serveExpress } from '@adi-family/http-express'

const app = express()

// Global Express middleware
app.use(cors())
app.use(helmet())
app.use(express.json())

// Handler-level middleware is independent
serveExpress(app, [
  handler({ ...config, middleware: [requireAuth] }, async (ctx) => { /* ... */ })
])
```

### Native HTTP

With native HTTP, implement middleware manually:

```typescript
import http from 'http'
import { createHandler } from '@adi-family/http-native'

const requestHandler = createHandler(handlers)

const server = http.createServer(async (req, res) => {
  // Custom "middleware" logic
  res.setHeader('X-Custom-Header', 'value')

  await requestHandler(req, res)
})
```

## Next Steps

- **[Error Handling](/guide/error-handling)** - Handle errors in middleware
- **[Testing](/guide/testing)** - Test middleware functions
- **[Examples](/examples/auth)** - See authentication examples

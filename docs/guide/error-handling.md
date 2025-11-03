# Error Handling

Comprehensive error handling strategies for @adi-family/http applications.

## Built-in Error Handling

The adapters automatically handle common errors:

### Validation Errors

Zod validation errors return `400 Bad Request`:

```typescript
// Request with invalid data
POST /api/users
{
  "name": "",
  "email": "not-an-email"
}

// Automatic response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["name"],
      "message": "String must contain at least 1 character(s)"
    },
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

### Not Found

Unmatched routes return `404 Not Found`:

```typescript
GET /api/nonexistent

// Response: 404 Not Found
{
  "error": "Not found"
}
```

### Server Errors

Uncaught exceptions return `500 Internal Server Error`:

```typescript
handler(config, async (ctx) => {
  throw new Error('Something went wrong')
})

// Response: 500 Internal Server Error
{
  "error": "Something went wrong"
}
```

## Custom Error Classes

Create structured error classes for different scenarios:

```typescript
// errors/http-error.ts
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, message, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Resource not found') {
    super(404, message)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(401, message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'Resource conflict') {
    super(409, message)
    this.name = 'ConflictError'
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message: string = 'Too many requests') {
    super(429, message)
    this.name = 'TooManyRequestsError'
  }
}
```

## Using Custom Errors

Throw custom errors in handlers:

```typescript
import { handler } from '@adi-family/http'
import { NotFoundError, UnauthorizedError, ConflictError } from './errors'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return user
})

export const createUserHandler = handler(createUserConfig, async (ctx) => {
  // Check if email already exists
  const existing = await db.users.findByEmail(ctx.body.email)

  if (existing) {
    throw new ConflictError('Email already in use')
  }

  return await db.users.create(ctx.body)
})

export const updateUserHandler = handler(updateUserConfig, async (ctx) => {
  const authUser = (ctx as any).user

  // Users can only update their own profile
  if (authUser.id !== ctx.params.id) {
    throw new ForbiddenError('Cannot update another user\'s profile')
  }

  const user = await db.users.update(ctx.params.id, ctx.body)

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return user
})
```

## Error Middleware

Handle errors in middleware:

```typescript
// middleware/error-handler.ts
import type { HandlerContext } from '@adi-family/http'
import { HttpError } from '../errors'

export async function errorHandler(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  try {
    return await next()
  } catch (error) {
    // Log error
    console.error('Handler error:', error)

    // Re-throw to let adapter handle it
    throw error
  }
}

// Usage
export const getUserHandler = handler(
  {
    ...getUserConfig,
    middleware: [errorHandler, requireAuth]
  },
  async (ctx) => {
    return await db.users.findById(ctx.params.id)
  }
)
```

## Global Error Handling

### Express

Add a global error handler after registering routes:

```typescript
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { HttpError } from './errors'

const app = express()
app.use(express.json())

// Register handlers
serveExpress(app, handlers)

// Global error handler (must be after routes)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  })

  // Handle HttpError
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details
    })
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: (err as any).errors
    })
  }

  // Default to 500
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})
```

### Native HTTP

Handle errors in the request handler:

```typescript
import http from 'http'
import { createHandler } from '@adi-family/http-native'
import { HttpError } from './errors'

const requestHandler = createHandler(handlers)

const server = http.createServer(async (req, res) => {
  try {
    await requestHandler(req, res)
  } catch (error) {
    console.error('Request error:', error)

    // Already responded
    if (res.headersSent) {
      return
    }

    let statusCode = 500
    let message = 'Internal server error'
    let details = undefined

    if (error instanceof HttpError) {
      statusCode = error.statusCode
      message = error.message
      details = error.details
    }

    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      error: message,
      details
    }))
  }
})

server.listen(3000)
```

## Error Responses

### Standard Format

Use consistent error response format:

```typescript
interface ErrorResponse {
  error: string           // Human-readable error message
  code?: string          // Machine-readable error code
  details?: unknown      // Additional error details
  timestamp?: string     // When the error occurred
  path?: string          // Request path that caused error
  requestId?: string     // Request ID for tracking
}
```

Example implementation:

```typescript
// errors/formatter.ts
export function formatError(error: Error, req?: any): ErrorResponse {
  const response: ErrorResponse = {
    error: error.message,
    timestamp: new Date().toISOString()
  }

  if (req) {
    response.path = req.url
  }

  if (error instanceof HttpError) {
    response.code = error.name
    response.details = error.details
  }

  return response
}

// Usage in error handler
app.use((err, req, res, next) => {
  const errorResponse = formatError(err, req)
  const statusCode = err instanceof HttpError ? err.statusCode : 500

  res.status(statusCode).json(errorResponse)
})
```

## Validation Error Details

Provide detailed validation errors:

```typescript
// When validation fails:
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": ["body", "email"],
      "message": "Invalid email address",
      "code": "invalid_string"
    },
    {
      "path": ["body", "age"],
      "message": "Number must be greater than or equal to 18",
      "code": "too_small"
    }
  ]
}
```

## Handling Async Errors

Always use try-catch for async operations:

```typescript
export const getUserHandler = handler(getUserConfig, async (ctx) => {
  try {
    const user = await db.users.findById(ctx.params.id)

    if (!user) {
      throw new NotFoundError('User not found')
    }

    return user
  } catch (error) {
    // Log error with context
    console.error('Failed to get user:', {
      userId: ctx.params.id,
      error: error instanceof Error ? error.message : error
    })

    // Re-throw for handler to catch
    throw error
  }
})
```

## Error Recovery

Implement fallback strategies:

```typescript
export const getUserHandler = handler(getUserConfig, async (ctx) => {
  try {
    // Try primary database
    return await db.users.findById(ctx.params.id)
  } catch (error) {
    console.error('Primary database failed, trying cache')

    try {
      // Fallback to cache
      const cached = await cache.get(`user:${ctx.params.id}`)

      if (cached) {
        return cached
      }
    } catch (cacheError) {
      console.error('Cache also failed')
    }

    // Both failed
    throw new Error('Service temporarily unavailable')
  }
})
```

## Logging Errors

Structure error logging:

```typescript
// utils/logger.ts
export function logError(error: Error, context?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  }

  if (error instanceof HttpError) {
    logEntry.statusCode = error.statusCode
    logEntry.details = error.details
  }

  // Send to logging service
  console.error(JSON.stringify(logEntry))
}

// Usage in middleware
export async function errorLogging(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  try {
    return await next()
  } catch (error) {
    logError(error as Error, {
      url: ctx.url.toString(),
      method: ctx.method,
      params: ctx.params,
      query: ctx.query
    })

    throw error
  }
}
```

## Error Monitoring

Integrate with error tracking services:

```typescript
// utils/monitoring.ts
import * as Sentry from '@sentry/node'

export function initErrorMonitoring() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV
  })
}

export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context
  })
}

// Usage in middleware
export async function errorMonitoring(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  try {
    return await next()
  } catch (error) {
    captureError(error as Error, {
      url: ctx.url.toString(),
      method: ctx.method,
      params: ctx.params
    })

    throw error
  }
}
```

## Testing Error Handling

Test error scenarios:

```typescript
import { describe, it, expect } from 'vitest'
import { getUserHandler } from './handlers/users'
import { NotFoundError } from './errors'

describe('getUserHandler', () => {
  it('throws NotFoundError when user not found', async () => {
    const ctx = {
      params: { id: 'nonexistent' },
      query: {},
      body: {},
      headers: new Map(),
      url: new URL('http://test/api/users/nonexistent')
    }

    await expect(
      getUserHandler.execute(ctx)
    ).rejects.toThrow(NotFoundError)
  })

  it('returns error message', async () => {
    const ctx = {
      params: { id: 'nonexistent' },
      query: {},
      body: {},
      headers: new Map(),
      url: new URL('http://test/api/users/nonexistent')
    }

    try {
      await getUserHandler.execute(ctx)
      expect.fail('Should have thrown error')
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError)
      expect((error as NotFoundError).message).toBe('User not found')
      expect((error as NotFoundError).statusCode).toBe(404)
    }
  })
})
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// ✅ Good - specific error
throw new NotFoundError('User not found')

// ❌ Bad - generic error
throw new Error('Not found')
```

### 2. Include Context

```typescript
// ✅ Good - includes context
throw new NotFoundError(`User ${userId} not found`)

// ❌ Bad - no context
throw new NotFoundError('User not found')
```

### 3. Don't Expose Internal Details

```typescript
// ✅ Good - safe error message
throw new Error('Failed to process request')

// ❌ Bad - exposes internals
throw new Error(`Database error: ${dbError.connectionString}`)
```

### 4. Log Before Throwing

```typescript
// ✅ Good - log then throw
console.error('Database query failed:', error)
throw new Error('Failed to fetch user')

// ❌ Bad - throw without logging
throw new Error('Failed to fetch user')
```

### 5. Handle All Async Operations

```typescript
// ✅ Good - wrapped in try-catch
try {
  const result = await someAsyncOp()
  return result
} catch (error) {
  throw new Error('Operation failed')
}

// ❌ Bad - no error handling
const result = await someAsyncOp()
return result
```

## Error Response Examples

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    { "path": ["email"], "message": "Invalid email" }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "User with ID '123' not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Email already in use"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 60 seconds"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Next Steps

- **[Middleware](/guide/middleware)** - Add error handling middleware
- **[Testing](/guide/testing)** - Test error scenarios
- **[Examples](/examples/auth)** - See error handling in authentication

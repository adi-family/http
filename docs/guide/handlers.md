# Handlers

Handlers combine your API configuration with server-side business logic. They provide type-safe request/response handling while maintaining a clean separation between contracts and implementation.

## Overview

A handler consists of two parts:

1. **HandlerConfig** - The API contract (shared with client)
2. **Handler Function** - The server-side implementation

This separation allows you to share the contract between client and server while keeping the implementation server-only.

## Creating Handlers

Use the `handler()` factory function to create a handler:

```typescript
import { handler } from '@adi-family/http'
import { getUserConfig } from './contracts'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  return user
})
```

## Handler Configuration

The `HandlerConfig` defines your API contract:

```typescript
interface HandlerConfig<TParams, TQuery, TBody, TResponse> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'  // Default: 'GET'
  route: RouteConfig<TParams>                            // Required
  query?: QueryConfig<TQuery>                            // Optional
  body?: BodyConfig<TBody>                               // Optional
  response?: ResponseConfig<TResponse>                   // Optional
}
```

### Example Configuration

```typescript
import { route } from '@adi-family/http'
import { z } from 'zod'

export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string().min(1).max(255),
      email: z.string().email(),
      age: z.number().min(18).optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      age: z.number().optional(),
      created_at: z.string().datetime()
    })
  }
} as const satisfies HandlerConfig
```

## Handler Context

Your handler function receives a context object with validated data:

```typescript
interface HandlerContext<TParams, TQuery, TBody> {
  params: TParams      // URL parameters (parsed from route)
  query: TQuery        // Query parameters (validated)
  body: TBody          // Request body (validated)
  headers: Headers     // Request headers
  raw: unknown         // Framework-specific request object
}
```

### Using Context

```typescript
export const updateUserHandler = handler(updateUserConfig, async (ctx) => {
  // ctx.params - Type-safe URL parameters
  const userId = ctx.params.id

  // ctx.query - Validated query parameters
  const { include } = ctx.query

  // ctx.body - Validated request body
  const { name, email } = ctx.body

  // ctx.headers - Access request headers
  const authToken = ctx.headers.get('authorization')

  // ctx.raw - Framework-specific request (Express req, Node.js IncomingMessage)
  // Use with caution - breaks framework independence

  const user = await db.users.update(userId, { name, email })
  return user
})
```

## Complete Example

### 1. Define the Contract

```typescript
// contracts/users.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

export const getUserConfig = {
  method: 'GET',
  route: route.dynamic('/api/users/:id', z.object({ id: z.string() })),
  query: {
    schema: z.object({
      include: z.enum(['posts', 'comments']).optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      posts: z.array(z.object({
        id: z.string(),
        title: z.string()
      })).optional()
    })
  }
} as const satisfies HandlerConfig
```

### 2. Implement the Handler

```typescript
// handlers/users.ts
import { handler } from '@adi-family/http'
import { getUserConfig } from '../contracts/users'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  // Conditionally include related data
  if (ctx.query.include === 'posts') {
    const posts = await db.posts.findByUserId(user.id)
    return { ...user, posts }
  }

  return user
})
```

### 3. Register with Server

```typescript
// server.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { getUserHandler } from './handlers/users'

const app = express()
app.use(express.json())

serveExpress(app, [getUserHandler])

app.listen(3000)
```

## Multiple Handlers

Register multiple handlers at once:

```typescript
import { serveExpress } from '@adi-family/http-express'

serveExpress(app, [
  // User handlers
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,

  // Project handlers
  listProjectsHandler,
  getProjectHandler,
  createProjectHandler
])
```

## Error Handling

Handlers automatically catch and format errors:

```typescript
export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)

  if (!user) {
    // Throwing an error will result in HTTP 500
    throw new Error('User not found')
  }

  return user
})
```

For more control over HTTP status codes, use your framework's error handling:

```typescript
import express from 'express'

const app = express()

// Custom error handler (Express example)
app.use((err, req, res, next) => {
  if (err.message === 'User not found') {
    return res.status(404).json({ error: err.message })
  }

  res.status(500).json({ error: 'Internal server error' })
})
```

## Validation Errors

Validation errors are automatically caught and returned with HTTP 400:

```typescript
// If body validation fails, adapter returns:
// Status: 400
// Body: {
//   error: 'Validation failed',
//   details: [
//     { path: ['email'], message: 'Invalid email' }
//   ]
// }
```

## Type Inference

Extract types from your handler configuration:

```typescript
import type { InferParams, InferQuery, InferBody, InferResponse } from '@adi-family/http'

type UserParams = InferParams<typeof getUserConfig>
// { id: string }

type UserQuery = InferQuery<typeof getUserConfig>
// { include?: 'posts' | 'comments' }

type UserResponse = InferResponse<typeof getUserConfig>
// { id: string; name: string; email: string; posts?: Array<{...}> }
```

## Best Practices

### 1. Keep Contracts Separate

Store contracts in a separate package or directory that can be shared:

```
/packages
  /contracts      <- Share this with frontend
    /users.ts
    /projects.ts
  /server
    /handlers
      /users.ts
      /projects.ts
```

### 2. Use Type Guards

```typescript
export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  // TypeScript knows user is defined here
  return {
    id: user.id,
    name: user.name,
    email: user.email
  }
})
```

### 3. Validate Business Logic

Zod validates structure, but business logic validation is your responsibility:

```typescript
export const createUserHandler = handler(createUserConfig, async (ctx) => {
  // Zod already validated that email is a valid email format
  const { email, name } = ctx.body

  // But you need to check business rules
  const existing = await db.users.findByEmail(email)
  if (existing) {
    throw new Error('Email already in use')
  }

  return await db.users.create({ email, name })
})
```

### 4. Use as const satisfies

This ensures type inference while checking the type:

```typescript
export const getUserConfig = {
  method: 'GET',
  route: route.static('/api/users')
} as const satisfies HandlerConfig
//         ^^^^^^^^^^^^^^^^^^^^^^^ Type-safe and infers literal types
```

## Next Steps

- [Client](/guide/client) - Learn how to call handlers from the client
- [Validation](/guide/validation) - Deep dive into Zod validation
- [Custom Routes](/guide/custom-routes) - Advanced routing patterns

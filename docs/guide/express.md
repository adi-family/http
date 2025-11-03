# Express Adapter

The Express adapter (`@adi-family/http-express`) allows you to serve type-safe handlers using Express.js.

## Installation

::: code-group

```bash [npm]
npm install @adi-family/http @adi-family/http-express express zod
```

```bash [bun]
bun add @adi-family/http @adi-family/http-express express zod
```

:::

## Basic Usage

```typescript
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { getUserHandler, createUserHandler } from './handlers'

const app = express()

// Required: Parse JSON bodies
app.use(express.json())

// Register your handlers
serveExpress(app, [
  getUserHandler,
  createUserHandler
])

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## How It Works

The `serveExpress` function:

1. **Registers routes** - Maps each handler's route config to Express routes
2. **Parses requests** - Extracts params, query, and body
3. **Validates data** - Validates query and body using Zod schemas
4. **Executes handlers** - Calls your handler functions
5. **Returns responses** - Sends JSON responses with proper status codes
6. **Handles errors** - Catches and formats validation and runtime errors

## Complete Example

### 1. Define Contracts

```typescript
// packages/api-contracts/users.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

export const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users'),
  query: {
    schema: z.object({
      page: z.number().optional(),
      limit: z.number().optional(),
      search: z.string().optional()
    })
  },
  response: {
    schema: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    }))
  }
} as const satisfies HandlerConfig

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

export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().min(18).optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    })
  }
} as const satisfies HandlerConfig

export const updateUserConfig = {
  method: 'PATCH',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() })),
  body: {
    schema: z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    })
  }
} as const satisfies HandlerConfig

export const deleteUserConfig = {
  method: 'DELETE',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({ success: z.boolean() })
  }
} as const satisfies HandlerConfig
```

### 2. Implement Handlers

```typescript
// packages/backend/handlers/users.ts
import { handler } from '@adi-family/http'
import {
  listUsersConfig,
  getUserConfig,
  createUserConfig,
  updateUserConfig,
  deleteUserConfig
} from '@api-contracts/users'
import * as db from '../db/users'

export const listUsersHandler = handler(listUsersConfig, async (ctx) => {
  const { page = 1, limit = 10, search } = ctx.query
  return await db.findAll({ page, limit, search })
})

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.findById(ctx.params.id)
  if (!user) {
    throw new Error('User not found')
  }
  return user
})

export const createUserHandler = handler(createUserConfig, async (ctx) => {
  const user = await db.create(ctx.body)
  return user
})

export const updateUserHandler = handler(updateUserConfig, async (ctx) => {
  const user = await db.update(ctx.params.id, ctx.body)
  if (!user) {
    throw new Error('User not found')
  }
  return user
})

export const deleteUserHandler = handler(deleteUserConfig, async (ctx) => {
  await db.remove(ctx.params.id)
  return { success: true }
})
```

### 3. Set Up Express Server

```typescript
// packages/backend/index.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import * as userHandlers from './handlers/users'

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Register handlers
serveExpress(app, [
  userHandlers.listUsersHandler,
  userHandlers.getUserHandler,
  userHandlers.createUserHandler,
  userHandlers.updateUserHandler,
  userHandlers.deleteUserHandler
])

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

## Using with Express Middleware

You can use Express middleware alongside your handlers:

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { serveExpress } from '@adi-family/http-express'

const app = express()

// Global middleware
app.use(cors())
app.use(helmet())
app.use(morgan('combined'))
app.use(express.json())

// Health check route (regular Express)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Type-safe API routes
serveExpress(app, [
  getUserHandler,
  createUserHandler
])

// 404 handler (regular Express)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler (regular Express)
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(3000)
```

## Route Registration

The adapter automatically registers routes based on your handler configs:

```typescript
// This handler config:
const config = {
  method: 'GET',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() }))
}

// Creates this Express route:
app.get('/api/users/:id', handler)
```

### Supported HTTP Methods

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

## Request Processing

### URL Parameters

Extracted from the URL pattern:

```typescript
const config = {
  route: route.pattern(
    '/api/projects/:projectId/tasks/:taskId',
    z.object({ projectId: z.string(), taskId: z.string() })
  )
}

// In handler:
handler(config, async (ctx) => {
  ctx.params.projectId  // From URL
  ctx.params.taskId     // From URL
})
```

### Query Parameters

Parsed from query string and validated:

```typescript
const config = {
  query: {
    schema: z.object({
      page: z.number().optional(),
      limit: z.number().optional()
    })
  }
}

// Request: GET /api/users?page=2&limit=20
handler(config, async (ctx) => {
  ctx.query.page   // 2 (number)
  ctx.query.limit  // 20 (number)
})
```

Numbers are automatically converted from strings.

### Request Body

Parsed from JSON and validated:

```typescript
const config = {
  body: {
    schema: z.object({
      name: z.string(),
      email: z.string().email()
    })
  }
}

// Request: POST /api/users with JSON body
handler(config, async (ctx) => {
  ctx.body.name   // Validated string
  ctx.body.email  // Validated email
})
```

### Headers

Access request headers:

```typescript
handler(config, async (ctx) => {
  const auth = ctx.headers.get('Authorization')
  const contentType = ctx.headers.get('Content-Type')
})
```

## Response Handling

### Success Responses

Return data from your handler:

```typescript
handler(config, async (ctx) => {
  return { id: '123', name: 'Alice' }
})
// Automatically sends: 200 OK with JSON body
```

### Status Codes

The adapter automatically sets:
- `200` - Successful GET, PUT, PATCH, DELETE
- `201` - Successful POST
- `400` - Validation errors
- `404` - Route not found
- `500` - Server errors

## Error Handling

### Validation Errors

Automatic Zod validation:

```typescript
// Request with invalid data
POST /api/users
{
  "name": "",  // Too short
  "email": "invalid"  // Not an email
}

// Automatic response:
{
  "error": "Validation failed",
  "details": [
    { "path": ["name"], "message": "String must contain at least 1 character(s)" },
    { "path": ["email"], "message": "Invalid email" }
  ]
}
```

### Runtime Errors

Throw errors in handlers:

```typescript
handler(config, async (ctx) => {
  const user = await db.findById(ctx.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  return user
})
// Sends 500 with error message
```

For custom error handling, see [Error Handling](/guide/error-handling).

## Advanced Configuration

### Custom Error Responses

```typescript
import { serveExpress } from '@adi-family/http-express'

const app = express()
app.use(express.json())

serveExpress(app, handlers)

// Add custom error handler after serveExpress
app.use((err, req, res, next) => {
  if (err.statusCode === 404) {
    res.status(404).json({ error: 'Resource not found' })
  } else if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message, details: err.details })
  } else {
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

### Mounting at Prefix

```typescript
const app = express()
const apiRouter = express.Router()

// Mount all handlers under /api
serveExpress(apiRouter, handlers)
app.use('/api', apiRouter)

// Routes are now at /api/users, /api/users/:id, etc.
```

### Multiple Handler Groups

```typescript
import { serveExpress } from '@adi-family/http-express'

const app = express()
app.use(express.json())

// Register different handler groups
serveExpress(app, userHandlers)
serveExpress(app, projectHandlers)
serveExpress(app, taskHandlers)
```

## Performance Tips

1. **Use express.json() middleware** - Required for parsing request bodies
2. **Enable compression** - Use `compression` middleware for large responses
3. **Use caching** - Add caching middleware for frequently accessed data
4. **Connection pooling** - Use database connection pools

```typescript
import compression from 'compression'
import { serveExpress } from '@adi-family/http-express'

const app = express()

app.use(compression())
app.use(express.json())

serveExpress(app, handlers)
```

## API Reference

### `serveExpress(app, handlers)`

Registers handlers with an Express app.

**Parameters:**
- `app: Express | Router` - Express app or router instance
- `handlers: Handler[]` - Array of handlers to register

**Returns:** `void`

**Example:**
```typescript
import express from 'express'
import { serveExpress } from '@adi-family/http-express'

const app = express()
serveExpress(app, [getUserHandler, createUserHandler])
```

## Next Steps

- **[Middleware](/guide/middleware)** - Add custom middleware to handlers
- **[Error Handling](/guide/error-handling)** - Custom error handling strategies
- **[Testing](/guide/testing)** - Test your Express routes
- **[Examples](/examples/basic)** - See complete examples

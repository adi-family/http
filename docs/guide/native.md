# Native HTTP Adapter

The Native HTTP adapter (`@adi-family/http-native`) allows you to serve type-safe handlers using only Node.js built-in HTTP/HTTPS modules - no framework dependencies required.

## Installation

::: code-group

```bash [npm]
npm install @adi-family/http @adi-family/http-native zod
```

```bash [bun]
bun add @adi-family/http @adi-family/http-native zod
```

:::

## Basic Usage

```typescript
import { serveNative } from '@adi-family/http-native'
import { getUserHandler, createUserHandler } from './handlers'

const server = serveNative(
  [getUserHandler, createUserHandler],
  {
    port: 3000,
    hostname: '0.0.0.0',
    onListen: (port, hostname) => {
      console.log(`Server running on http://${hostname}:${port}`)
    }
  }
)
```

That's it! No Express, no middleware setup, just your handlers.

## Why Use Native HTTP?

### Advantages

- **Zero dependencies** - Only uses Node.js built-in modules
- **Lightweight** - No framework overhead
- **Fast** - Direct HTTP handling without middleware layers
- **Simple** - Easy to understand and debug
- **Full control** - Access to raw `http.Server` instance

### Considerations

- **No middleware ecosystem** - Can't use Express/Connect middleware
- **Manual implementations** - Need to implement features like CORS, compression yourself
- **Less mature** - Smaller community compared to Express

## Complete Example

### 1. Define Contracts

```typescript
// packages/api-contracts/users.ts
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

export const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users'),
  query: {
    schema: z.object({
      page: z.number().optional(),
      limit: z.number().optional()
    })
  },
  response: {
    schema: z.array(z.object({
      id: z.string(),
      name: z.string()
    }))
  }
} as const satisfies HandlerConfig

export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string().min(1),
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
} as const satisfies HandlerConfig
```

### 2. Implement Handlers

```typescript
// packages/backend/handlers/users.ts
import { handler } from '@adi-family/http'
import {
  getUserConfig,
  listUsersConfig,
  createUserConfig
} from '@api-contracts/users'
import * as db from '../db/users'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.findById(ctx.params.id)
  if (!user) {
    throw new Error('User not found')
  }
  return user
})

export const listUsersHandler = handler(listUsersConfig, async (ctx) => {
  const { page = 1, limit = 10 } = ctx.query
  return await db.findAll({ page, limit })
})

export const createUserHandler = handler(createUserConfig, async (ctx) => {
  const user = await db.create(ctx.body)
  return user
})
```

### 3. Start Server

```typescript
// packages/backend/index.ts
import { serveNative } from '@adi-family/http-native'
import * as userHandlers from './handlers/users'

const server = serveNative(
  [
    userHandlers.getUserHandler,
    userHandlers.listUsersHandler,
    userHandlers.createUserHandler
  ],
  {
    port: 3000,
    hostname: '0.0.0.0',
    onListen: (port, hostname) => {
      console.log(`Server running on http://${hostname}:${port}`)
    }
  }
)

// Optional: Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error)
  process.exit(1)
})

// Optional: Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
```

## HTTPS Support

Enable HTTPS by providing certificates:

```typescript
import { serveNative } from '@adi-family/http-native'
import { readFileSync } from 'fs'

const server = serveNative(
  [getUserHandler, createUserHandler],
  {
    port: 443,
    hostname: '0.0.0.0',
    https: {
      key: readFileSync('./private-key.pem'),
      cert: readFileSync('./certificate.pem')
    },
    onListen: (port, hostname) => {
      console.log(`HTTPS server running on https://${hostname}:${port}`)
    }
  }
)
```

### Self-Signed Certificates (Development)

Generate self-signed certificates for local development:

```bash
# Generate private key
openssl genrsa -out private-key.pem 2048

# Generate certificate
openssl req -new -x509 -key private-key.pem -out certificate.pem -days 365
```

Then use them:

```typescript
const server = serveNative(handlers, {
  port: 3000,
  https: {
    key: readFileSync('./private-key.pem'),
    cert: readFileSync('./certificate.pem')
  }
})
```

## Custom Server Setup

For more control, use `createHandler` to get a request handler:

```typescript
import http from 'http'
import { createHandler } from '@adi-family/http-native'
import { getUserHandler, createUserHandler } from './handlers'

// Create the request handler
const requestHandler = createHandler([
  getUserHandler,
  createUserHandler
])

// Create custom HTTP server
const server = http.createServer(requestHandler)

// Add custom event handlers
server.on('error', (error) => {
  console.error('Server error:', error)
})

server.on('clientError', (error, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

// Start listening
server.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://localhost:3000')
})
```

## Request Processing

The adapter automatically handles:

### URL Parameters

```typescript
// Route: /api/users/:id
// Request: GET /api/users/123

handler(config, async (ctx) => {
  ctx.params.id  // "123"
})
```

### Query Parameters

```typescript
// Request: GET /api/users?page=2&limit=20

handler(config, async (ctx) => {
  ctx.query.page   // 2 (number)
  ctx.query.limit  // 20 (number)
})
```

Numbers are automatically converted from query strings.

### Request Body

```typescript
// Request: POST /api/users
// Content-Type: application/json
// Body: {"name":"Alice","email":"alice@example.com"}

handler(config, async (ctx) => {
  ctx.body.name   // "Alice"
  ctx.body.email  // "alice@example.com"
})
```

### Headers

```typescript
handler(config, async (ctx) => {
  const auth = ctx.headers.get('Authorization')
  const contentType = ctx.headers.get('Content-Type')
  const userAgent = ctx.headers.get('User-Agent')
})
```

## Response Handling

### Success Responses

```typescript
handler(config, async (ctx) => {
  return { id: '123', name: 'Alice' }
})
// Sends: 200 OK with JSON body
```

### Status Codes

Automatic status codes:
- `200` - Successful GET, PUT, PATCH, DELETE
- `201` - Successful POST
- `400` - Validation errors or malformed JSON
- `404` - Route not found
- `500` - Server errors

### Content-Type

Responses are automatically sent as `application/json`.

## Error Handling

### Validation Errors

Zod validation errors are handled automatically:

```typescript
// Request with invalid data
POST /api/users
{
  "name": "",
  "email": "invalid"
}

// Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    { "path": ["name"], "message": "String must contain at least 1 character(s)" },
    { "path": ["email"], "message": "Invalid email" }
  ]
}
```

### Runtime Errors

```typescript
handler(config, async (ctx) => {
  const user = await db.findById(ctx.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  return user
})
// Sends: 500 Internal Server Error
```

For custom error handling, see [Error Handling](/guide/error-handling).

## Advanced Features

### Health Check Endpoint

Add a simple health check:

```typescript
import { handler, route } from '@adi-family/http'
import { z } from 'zod'

const healthCheckHandler = handler(
  {
    method: 'GET',
    route: route.static('/health'),
    response: {
      schema: z.object({
        status: z.string(),
        timestamp: z.string()
      })
    }
  },
  async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  }
)

const server = serveNative([
  healthCheckHandler,
  getUserHandler,
  createUserHandler
])
```

### Graceful Shutdown

Handle shutdown signals:

```typescript
const server = serveNative(handlers, { port: 3000 })

const shutdown = () => {
  console.log('Shutting down gracefully...')

  server.close(() => {
    console.log('Server closed')

    // Close database connections
    // db.close()

    process.exit(0)
  })

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

### Custom CORS

Since there's no middleware, implement CORS manually:

```typescript
import http from 'http'
import { createHandler } from '@adi-family/http-native'

const requestHandler = createHandler(handlers)

const server = http.createServer(async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Process request
  await requestHandler(req, res)
})

server.listen(3000)
```

### Request Logging

Add simple logging:

```typescript
import http from 'http'
import { createHandler } from '@adi-family/http-native'

const requestHandler = createHandler(handlers)

const server = http.createServer(async (req, res) => {
  const start = Date.now()

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)

  await requestHandler(req, res)

  // Log response
  const duration = Date.now() - start
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`)
})

server.listen(3000)
```

## Performance

The native adapter is designed for performance:

- **No middleware overhead** - Direct request handling
- **Minimal parsing** - Only parses what's needed
- **Connection reuse** - HTTP keep-alive enabled by default
- **Streaming support** - Uses Node.js streams efficiently

### Benchmarks

Compared to Express on typical CRUD operations:
- ~20-30% faster request handling
- ~40% less memory usage
- Fewer dependencies (better cold start)

## API Reference

### `serveNative(handlers, options)`

Creates and starts an HTTP or HTTPS server.

**Parameters:**
- `handlers: Handler[]` - Array of handlers to serve
- `options?: NativeServerOptions` - Server configuration

**Options:**
- `port?: number` - Port to listen on (default: 3000)
- `hostname?: string` - Hostname to bind to (default: 'localhost')
- `https?: https.ServerOptions` - HTTPS configuration (enables HTTPS if provided)
- `onListen?: (port: number, hostname: string) => void` - Called when server starts

**Returns:** `http.Server | https.Server`

### `createHandler(handlers)`

Creates a request handler without starting a server.

**Parameters:**
- `handlers: Handler[]` - Array of handlers

**Returns:** `(req: IncomingMessage, res: ServerResponse) => Promise<void>`

## Next Steps

- **[Middleware](/guide/middleware)** - Add custom middleware to handlers
- **[Error Handling](/guide/error-handling)** - Custom error handling strategies
- **[Testing](/guide/testing)** - Test your native HTTP routes
- **[Examples](/examples/basic)** - See complete examples

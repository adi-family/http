# @adi-family/http-native

Native Node.js HTTP adapter for [@adi-family/http](https://www.npmjs.com/package/@adi-family/http) - converts type-safe handlers into native Node.js HTTP server handlers without any framework dependencies.

## Installation

```bash
npm install @adi-family/http @adi-family/http-native zod
# or
bun add @adi-family/http @adi-family/http-native zod
```

## Quick Start

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

## Features

- **Zero Dependencies** - Uses only Node.js built-in `http` and `https` modules
- **Automatic Routing** - Maps handlers to routes automatically
- **Built-in Validation** - Validates query and body with Zod
- **Error Handling** - Handles validation errors automatically
- **Type Safety** - Full TypeScript support
- **HTTPS Support** - Easy HTTPS server setup

## Usage Examples

### Basic HTTP Server

```typescript
import { serveNative } from '@adi-family/http-native'
import { handler, route } from '@adi-family/http'
import { z } from 'zod'

const getUserHandler = handler(
  {
    method: 'GET',
    route: route.pattern('/api/users/:id', z.object({ id: z.string() })),
    response: {
      schema: z.object({
        id: z.string(),
        name: z.string()
      })
    }
  },
  async (ctx) => {
    const user = await db.users.findById(ctx.params.id)
    return user
  }
)

const server = serveNative([getUserHandler], {
  port: 3000
})
```

### HTTPS Server

```typescript
import { serveNative } from '@adi-family/http-native'
import { readFileSync } from 'fs'

const server = serveNative([getUserHandler], {
  port: 443,
  hostname: '0.0.0.0',
  https: {
    key: readFileSync('./private-key.pem'),
    cert: readFileSync('./certificate.pem')
  },
  onListen: (port, hostname) => {
    console.log(`HTTPS server running on https://${hostname}:${port}`)
  }
})
```

### Custom Server Setup

If you need more control over the server, use `createHandler` instead:

```typescript
import http from 'http'
import { createHandler } from '@adi-family/http-native'
import { getUserHandler, createUserHandler } from './handlers'

const requestHandler = createHandler([
  getUserHandler,
  createUserHandler
])

const server = http.createServer(requestHandler)

// Add custom middleware or configuration
server.on('error', (error) => {
  console.error('Server error:', error)
})

server.listen(3000, '0.0.0.0', () => {
  console.log('Server is running')
})
```

### With Query Parameters

```typescript
import { handler, route } from '@adi-family/http'
import { z } from 'zod'

const listUsersHandler = handler(
  {
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
        name: z.string()
      }))
    }
  },
  async (ctx) => {
    const { page = 1, limit = 10, search } = ctx.query
    const users = await db.users.findAll({ page, limit, search })
    return users
  }
)
```

### With Request Body

```typescript
const createUserHandler = handler(
  {
    method: 'POST',
    route: route.static('/api/users'),
    body: {
      schema: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0).optional()
      })
    },
    response: {
      schema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      })
    }
  },
  async (ctx) => {
    const user = await db.users.create(ctx.body)
    return user
  }
)
```

## API Reference

### `serveNative(handlers, options)`

Creates and starts a native Node.js HTTP or HTTPS server.

**Parameters:**
- `handlers: Handler[]` - Array of handlers to serve
- `options: NativeServerOptions` - Server configuration options

**Options:**
- `port?: number` - Port to listen on (default: 3000)
- `hostname?: string` - Hostname to bind to (default: 'localhost')
- `https?: https.ServerOptions` - HTTPS options (creates HTTPS server if provided)
- `onListen?: (port, hostname) => void` - Callback when server starts

**Returns:** `http.Server | https.Server`

### `createHandler(handlers)`

Creates a request handler without starting a server. Useful for testing or custom server setup.

**Parameters:**
- `handlers: Handler[]` - Array of handlers

**Returns:** `(req: IncomingMessage, res: ServerResponse) => Promise<void>`

## Routing

The adapter automatically:
- Matches request method (GET, POST, PUT, PATCH, DELETE)
- Parses URL parameters from Express-style patterns (`:id`)
- Parses query parameters and converts numbers automatically
- Parses JSON request bodies
- Returns 404 for unmatched routes

## Error Handling

The adapter automatically handles:
- **Zod validation errors** - Returns 400 with error details
- **Not found** - Returns 404 for unmatched routes
- **Server errors** - Returns 500 for handler exceptions
- **Invalid JSON** - Returns 400 for malformed request bodies

## Performance

This adapter uses only Node.js built-in modules, making it:
- **Lightweight** - No heavy framework dependencies
- **Fast** - Direct HTTP handling without middleware overhead
- **Simple** - Easy to understand and debug

## Documentation

For complete documentation and examples, visit:
https://github.com/adi-family/http

## License

MIT - See LICENSE file for details

Copyright (c) 2025 ADI Family (https://github.com/adi-family)

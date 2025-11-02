# @adi-family/http - Framework-Agnostic HTTP Interface

framework-agnostic, type-safe, validation, contracts, DRY

A framework-agnostic, type-safe HTTP interface system that separates API contracts from implementation, enabling end-to-end type safety between client and server.

## Key Principles

- **Config-based contracts** - API definitions are pure configuration objects
- **Framework agnostic** - Works with Express, Hono, Fastify, or any HTTP framework
- **Type safety** - Full TypeScript inference from config to client
- **No param validation** - URL params used only for building paths
- **Validation where needed** - Body and query validated with Zod schemas
- **Separation of concerns** - Contracts live separately from server handlers

## Architecture

```
┌─────────────────┐
│  @api-contracts │  ← Shared between client & server
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

## Installation

```bash
# Core library
npm install @adi-family/http zod
# or
bun add @adi-family/http zod

# Framework adapters
npm install @adi-family/http-express  # For Express
npm install @adi-family/http-native   # For Native Node.js HTTP
# bun add @adi-family/http-hono       # For Hono (future)

# Create contracts package
mkdir -p packages/api-contracts
```

## Core Concepts

### 1. Handler Config Structure

```typescript
interface HandlerConfig<TParams, TQuery, TBody, TResponse> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  route: RouteConfig<TParams>  // Required - defines the endpoint
  query?: QueryConfig<TQuery>
  body?: BodyConfig<TBody>
  response?: ResponseConfig<TResponse>
}

// Route configuration - discriminated union
type RouteConfig<TParams> =
  | {
      type: 'static'
      path: string  // e.g., '/api/users'
    }
  | {
      type: 'pattern'
      pattern: string  // e.g., '/api/users/:id'
      params: ZodSchema<TParams>
      build?: (params: TParams) => string  // Optional URL builder
    }
  | {
      type: 'custom'
      params: ZodSchema<TParams>
      build: (params: TParams) => string  // Build URL from params
      parse: (url: URL) => TParams  // Extract params from URL
      is: (url: URL) => boolean  // Check if URL matches this route
    }

// Supporting types
interface QueryConfig<TQuery> {
  schema: ZodSchema<TQuery>  // Validated on client & server
}

interface BodyConfig<TBody> {
  schema: ZodSchema<TBody>  // Validated on client & server
}

interface ResponseConfig<TResponse> {
  schema: ZodSchema<TResponse>  // Validates response data
}
```

### 2. Route Types

- **Static routes**: Fixed paths with no parameters (e.g., `/api/users`)
- **Pattern routes**: Express-style patterns with path parameters (e.g., `/api/users/:id`)
- **Custom routes**: Full control over URL building, parsing, and matching

### 3. Validation Rules

- **Route params**: Validated with Zod schema (pattern and custom routes)
- **Query**: Validated with Zod on both client and server
- **Body**: Validated with Zod on both client and server
- **Response**: Validated with Zod (optional)

### 3. Project Structure

```
packages/
├── api-contracts/           # Shared configs
│   ├── projects.ts
│   ├── tasks.ts
│   └── users.ts
│
├── backend/                 # Server implementation
│   └── handlers/
│       ├── projects.ts      # Imports configs + adds logic
│       └── tasks.ts
│
├── client/                  # Client code
│   └── api/
│       └── projects.ts      # Imports configs + uses BaseClient
│
└── utils/
    ├── http/                # Core library
    │   ├── types.ts
    │   ├── handler.ts
    │   └── client.ts
    └── http-express/        # Express adapter
        └── serve.ts
```

## Usage Guide

### Step 1: Define Configs (API Contracts)

```typescript
// packages/api-contracts/projects.ts
import { z } from 'zod'
import { route } from '@adi-family/http'
import type { HandlerConfig } from '@adi-family/http'

// Simple GET request (no params)
export const listProjectsConfig = {
  method: 'GET',
  route: route.static('/api/projects'),
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

// GET with URL params (pattern route)
export const getProjectConfig = {
  method: 'GET',
  route: route.pattern('/api/projects/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional()
    })
  }
} as const satisfies HandlerConfig

// POST with body
export const createProjectConfig = {
  method: 'POST',
  route: route.static('/api/projects'),
  body: {
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string()
    })
  }
} as const satisfies HandlerConfig

// Complex nested route with params and query
export const getProjectTaskConfig = {
  method: 'GET',
  route: route.pattern(
    '/api/projects/:projectId/tasks/:taskId',
    z.object({
      projectId: z.string(),
      taskId: z.string()
    })
  ),
  query: {
    schema: z.object({
      include: z.enum(['comments', 'assignees']).optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      projectId: z.string(),
      title: z.string()
    })
  }
} as const satisfies HandlerConfig
```

### Step 2: Implement Server Handlers

```typescript
// packages/backend/handlers/projects.ts
import { handler } from '@adi-utils/http'
import {
  listProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  getProjectTaskConfig
} from '@api-contracts/projects'
import * as queries from '../db/projects'

// Create handlers by adding logic to configs
export const listProjectsHandler = handler(listProjectsConfig, async (ctx) => {
  const { page = 1, limit = 10 } = ctx.query
  const projects = await queries.findAllProjects({ page, limit })
  return projects
})

export const getProjectHandler = handler(getProjectConfig, async (ctx) => {
  const project = await queries.findProjectById(ctx.params.id)
  return project
})

export const createProjectHandler = handler(createProjectConfig, async (ctx) => {
  const project = await queries.createProject(ctx.body)
  return project
})

export const getProjectTaskHandler = handler(getProjectTaskConfig, async (ctx) => {
  const { projectId, taskId } = ctx.params
  const task = await queries.findTaskById(projectId, taskId)

  if (ctx.query.include === 'comments') {
    task.comments = await queries.findTaskComments(taskId)
  }

  return task
})
```

### Step 3: Serve with Express or Native HTTP

**Option A: Express**
```typescript
// packages/backend/index.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import * as projectHandlers from './handlers/projects'
import * as taskHandlers from './handlers/tasks'

const app = express()
app.use(express.json())

serveExpress(app, [
  projectHandlers.listProjectsHandler,
  projectHandlers.getProjectHandler,
  projectHandlers.createProjectHandler,
  projectHandlers.getProjectTaskHandler,
  // ... more handlers
])

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

**Option B: Native Node.js HTTP**
```typescript
// packages/backend/index.ts
import { serveNative } from '@adi-family/http-native'
import * as projectHandlers from './handlers/projects'
import * as taskHandlers from './handlers/tasks'

const server = serveNative(
  [
    projectHandlers.listProjectsHandler,
    projectHandlers.getProjectHandler,
    projectHandlers.createProjectHandler,
    projectHandlers.getProjectTaskHandler,
    // ... more handlers
  ],
  {
    port: 3000,
    hostname: '0.0.0.0',
    onListen: (port, hostname) => {
      console.log(`Server running on http://${hostname}:${port}`)
    }
  }
)
```

### Step 4: Use in Client

```typescript
// packages/client/src/api/projects.ts
import { BaseClient } from '@adi-utils/http'
import {
  listProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  getProjectTaskConfig
} from '@api-contracts/projects'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000',
  headers: {
    Authorization: `Bearer ${token}`
  }
})

// List projects with pagination
const projects = await client.run(listProjectsConfig, {
  query: { page: 1, limit: 20 }
})

// Get single project
const project = await client.run(getProjectConfig, {
  params: { id: '123' }
})

// Create project
const newProject = await client.run(createProjectConfig, {
  body: {
    name: 'My Project',
    description: 'A great project'
  }
})

// Complex nested route
const task = await client.run(getProjectTaskConfig, {
  params: {
    projectId: '123',
    taskId: '456'
  },
  query: { include: 'comments' }
})
```

## Advanced Features

### Middleware Support (Server-Side)

```typescript
// packages/backend/middleware/auth.ts
import type { HandlerContext } from '@adi-utils/http'

export async function requireAuth(
  ctx: HandlerContext<any, any, any>,
  next: () => Promise<any>
) {
  const authHeader = ctx.headers.get('Authorization')

  if (!authHeader) {
    throw new Error('Unauthorized')
  }

  // Validate token...

  return next()
}

// Use in handler
export const getProjectHandler = handler(
  { ...getProjectConfig, middleware: [requireAuth] },
  async (ctx) => {
    // Auth already checked
    return await queries.findProjectById(ctx.params.id)
  }
)
```

### Custom Error Handling

```typescript
// packages/utils/http/errors.ts
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
  constructor(details: unknown) {
    super(400, 'Validation failed', details)
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message)
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

// Use in handler
export const getProjectHandler = handler(getProjectConfig, async (ctx) => {
  const project = await queries.findProjectById(ctx.params.id)

  if (!project) {
    throw new NotFoundError('Project not found')
  }

  return project
})
```

### Custom Client Configuration

```typescript
// packages/client/src/api/base-client.ts
import { BaseClient } from '@adi-utils/http'

export function createApiClient(token: string) {
  return new BaseClient({
    baseUrl: import.meta.env.VITE_API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Client-Version': '1.0.0'
    },
    fetch: async (url, options) => {
      // Custom fetch with retry logic
      const response = await fetch(url, options)

      if (response.status === 401) {
        // Handle token refresh
      }

      return response
    }
  })
}
```

### Type Inference Helpers

```typescript
// packages/api-contracts/types.ts
import type { HandlerConfig } from '@adi-utils/http'

// Extract types from config
export type InferParams<T extends HandlerConfig> =
  T['params'] extends { schema: infer S } ? S : never

export type InferQuery<T extends HandlerConfig> =
  T['query'] extends { schema: infer S } ? S : never

export type InferBody<T extends HandlerConfig> =
  T['body'] extends { schema: infer S } ? S : never

export type InferResponse<T extends HandlerConfig> =
  T['response'] extends { schema: infer S } ? S : never

// Usage
import { getProjectConfig } from './projects'

type ProjectParams = InferParams<typeof getProjectConfig>
type ProjectResponse = InferResponse<typeof getProjectConfig>
```

## Migration from Hono

### Before (Hono)

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

const app = new Hono()
  .get('/projects/:id', zValidator('param', idSchema), async (c) => {
    const { id } = c.req.valid('param')
    const project = await queries.findProjectById(id)
    return c.json(project)
  })

// Client (Hono RPC)
const client = hc<typeof app>('http://localhost:3000')
const project = await client.projects[':id'].$get({ param: { id: '123' } })
```

### After (@adi-utils/http)

```typescript
// 1. Define config (contracts)
export const getProjectConfig = {
  method: 'GET',
  route: route.pattern('/api/projects/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({ id: z.string(), name: z.string() })
  }
} as const satisfies HandlerConfig

// 2. Server handler
export const getProjectHandler = handler(getProjectConfig, async (ctx) => {
  const project = await queries.findProjectById(ctx.params.id)
  return project
})

// 3. Serve
serveExpress(app, [getProjectHandler])

// 4. Client
const client = new BaseClient({ baseUrl: 'http://localhost:3000' })
const project = await client.run(getProjectConfig, {
  params: { id: '123' }
})
```

## Benefits

### vs Hono

- **Framework independent** - Not locked to Hono
- **Cleaner contracts** - Configs are pure data, no framework coupling
- **Better separation** - Server logic separate from API contract
- **Explicit typing** - No magic type inference from chained methods

### vs tRPC

- **REST-based** - Standard HTTP, works with any client
- **Simpler** - No complex router setup or subscription handling
- **Standard patterns** - Uses familiar HTTP concepts
- **Framework agnostic** - Works with any HTTP framework

### vs Raw Express

- **Type safety** - Full TypeScript inference
- **Validation** - Automatic Zod validation
- **DRY** - Share contracts between client and server
- **Maintainability** - Changes to API reflected everywhere

## Best Practices

1. **Keep configs simple** - Configs should be pure data, no complex logic
2. **Use proper HTTP methods** - GET for reads, POST for creates, etc.
3. **Validate at boundaries** - Validate body/query, not params
4. **Share contracts** - Export configs from `@api-contracts` package
5. **Separate concerns** - Keep handler logic in backend, configs in contracts
6. **Type everything** - Use `satisfies HandlerConfig` for type checking
7. **Document schemas** - Add descriptions to Zod schemas for documentation

## Examples

See `/examples` directory for complete working examples:
- `/examples/basic` - Simple CRUD API
- `/examples/nested-routes` - Complex nested routes
- `/examples/authentication` - Auth middleware
- `/examples/file-upload` - File upload handling
- `/examples/migration` - Migrating from Hono

## API Reference

### Core Types

```typescript
interface HandlerConfig<TParams, TQuery, TBody, TResponse>
interface HandlerContext<TParams, TQuery, TBody>
interface Handler<TParams, TQuery, TBody, TResponse>
```

### Core Functions

```typescript
function handler<TParams, TQuery, TBody, TResponse>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  fn: HandlerFunction<TParams, TQuery, TBody, TResponse>
): Handler<TParams, TQuery, TBody, TResponse>
```

### Client

```typescript
class BaseClient {
  constructor(config: ClientConfig)

  run<TParams, TQuery, TBody, TResponse>(
    config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
    options: { params?: TParams; query?: TQuery; body?: TBody }
  ): Promise<TResponse>
}
```

### Express Adapter

```typescript
function serveExpress(
  app: Express,
  handlers: Handler<any, any, any, any>[]
): void
```

### Native HTTP Adapter

```typescript
function serveNative(
  handlers: Handler<any, any, any, any>[],
  options?: NativeServerOptions
): http.Server | https.Server

function createHandler(
  handlers: Handler<any, any, any, any>[]
): (req: IncomingMessage, res: ServerResponse) => Promise<void>
```

## Packages

- [@adi-family/http](https://www.npmjs.com/package/@adi-family/http) - Core library
- [@adi-family/http-express](https://www.npmjs.com/package/@adi-family/http-express) - Express adapter
- [@adi-family/http-native](https://www.npmjs.com/package/@adi-family/http-native) - Native Node.js HTTP adapter

## Contributing

Issues and PRs welcome at https://github.com/adi-family/http

## License

MIT - Copyright (c) 2025 ADI Family (https://github.com/adi-family)

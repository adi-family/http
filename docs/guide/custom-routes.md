# Custom Routes

The route builder API provides four levels of customization, from simple static routes to fully custom routing logic. This allows you to start simple and add complexity only when needed.

## Route Builder API

All routes are created using the `route` object:

```typescript
import { route } from '@adi-family/http'
```

## Route Types

### 1. Static Routes

Use `route.static()` for routes with no parameters:

```typescript
route: route.static('/api/users')
```

**Features:**
- No URL parameters
- Simple and straightforward
- Auto-generated build/parse/match functions

**Example:**

```typescript
import { route } from '@adi-family/http'
import type { HandlerConfig } from '@adi-family/http'

export const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users')
} as const satisfies HandlerConfig
```

**Generated Functions:**

```typescript
// Build function
build() // Returns: '/api/users'

// Parse function (not really needed for static routes)
parse(url) // Returns: {}

// Match function
is(url) // Returns: true if url === '/api/users'
```

### 2. Dynamic Routes

Use `route.dynamic()` for routes with URL parameters:

```typescript
route: route.dynamic(
  '/api/users/:id',
  z.object({ id: z.string() })
)
```

**Features:**
- Express-style parameter syntax (`:id`)
- Auto-generated build/parse/match functions
- Type-safe parameters via Zod schema

**Single Parameter:**

```typescript
import { z } from 'zod'

route: route.dynamic(
  '/api/users/:id',
  z.object({ id: z.string() })
)

// Build: (params) => `/api/users/${params.id}`
// Parse: (url) => { id: url.pathname.split('/')[3] }
// Match: (url) => /^\/api\/users\/[^/]+$/.test(url)
```

**Multiple Parameters:**

```typescript
route: route.dynamic(
  '/api/projects/:projectId/tasks/:taskId',
  z.object({
    projectId: z.string(),
    taskId: z.string()
  })
)

// Build: (params) => `/api/projects/${params.projectId}/tasks/${params.taskId}`
```

**Nested Resources:**

```typescript
route: route.dynamic(
  '/api/orgs/:orgId/teams/:teamId/members/:memberId',
  z.object({
    orgId: z.string(),
    teamId: z.string(),
    memberId: z.string()
  })
)
```

### 3. Custom Builder Routes

Use `route.withBuilder()` when you need custom URL building logic but can use auto-generated parse and match:

```typescript
route: route.withBuilder({
  pattern: '/api/v:version/users/:id',
  params: z.object({
    version: z.number(),
    id: z.string()
  }),
  build: (params) => {
    if (params.version === 1) {
      return `/api/legacy/users/${params.id}`
    }
    return `/api/v${params.version}/users/${params.id}`
  }
})
```

**Features:**
- Custom `build()` function
- Auto-generated `parse()` and `is()` based on pattern
- Great for API versioning or conditional routing

**Use Cases:**

**API Versioning:**

```typescript
route: route.withBuilder({
  pattern: '/api/v:version/users/:id',
  params: z.object({
    version: z.number(),
    id: z.string()
  }),
  build: (params) => {
    // Route to different endpoints based on version
    if (params.version === 1) {
      return `/api/legacy/users/${params.id}`
    }
    return `/api/v${params.version}/users/${params.id}`
  }
})
```

**Conditional Paths:**

```typescript
route: route.withBuilder({
  pattern: '/api/:scope/projects/:id',
  params: z.object({
    scope: z.enum(['public', 'private']),
    id: z.string()
  }),
  build: (params) => {
    if (params.scope === 'public') {
      return `/api/projects/public/${params.id}`
    }
    return `/api/projects/private/${params.id}`
  }
})
```

**URL Encoding:**

```typescript
route: route.withBuilder({
  pattern: '/api/search/:query',
  params: z.object({
    query: z.string()
  }),
  build: (params) => {
    return `/api/search/${encodeURIComponent(params.query)}`
  }
})
```

### 4. Full Custom Routes

Use `route.full()` when you need complete control over build, parse, and match:

```typescript
route: route.full({
  params: z.object({
    tenantId: z.string(),
    userId: z.string()
  }),
  build: (params) => `/api/users/${params.userId}?tenant=${params.tenantId}`,
  parse: (url) => ({
    userId: url.pathname.split('/').pop()!,
    tenantId: url.searchParams.get('tenant')!
  }),
  is: (url) =>
    /^\/api\/users\/[^/]+$/.test(url.pathname) &&
    url.searchParams.has('tenant')
})
```

**Features:**
- Complete control over all routing logic
- Custom `build()`, `parse()`, and `is()` functions
- Most flexible option

**Use Cases:**

**Query String Parameters as Route Params:**

```typescript
route: route.full({
  params: z.object({
    tenantId: z.string(),
    userId: z.string()
  }),
  build: (params) =>
    `/api/users/${params.userId}?tenant=${params.tenantId}`,
  parse: (url) => ({
    userId: url.pathname.split('/').pop()!,
    tenantId: url.searchParams.get('tenant')!
  }),
  is: (url) =>
    /^\/api\/users\/[^/]+$/.test(url.pathname) &&
    url.searchParams.has('tenant')
})
```

**Hash-Based Routing:**

```typescript
route: route.full({
  params: z.object({
    section: z.string(),
    id: z.string()
  }),
  build: (params) =>
    `/api/items#${params.section}/${params.id}`,
  parse: (url) => {
    const [section, id] = url.hash.slice(1).split('/')
    return { section, id }
  },
  is: (url) =>
    /^#[^/]+\/[^/]+$/.test(url.hash)
})
```

**Custom Parameter Format:**

```typescript
route: route.full({
  params: z.object({
    coords: z.object({
      lat: z.number(),
      lng: z.number()
    })
  }),
  build: (params) =>
    `/api/locations/${params.coords.lat},${params.coords.lng}`,
  parse: (url) => {
    const [lat, lng] = url.pathname.split('/').pop()!.split(',').map(Number)
    return { coords: { lat, lng } }
  },
  is: (url) =>
    /^\/api\/locations\/[\d.-]+,[\d.-]+$/.test(url.pathname)
})
```

## Route Configuration Interface

```typescript
interface RouteConfig<TParams> {
  // For static routes
  build?: () => string
  parse?: (url: URL) => TParams
  is?: (url: URL) => boolean

  // For dynamic routes (auto-generated if not provided)
  pattern?: string
  params?: z.ZodSchema<TParams>

  // For adapter use (Express, etc.)
  serverPattern?: string
}
```

## Route Builder Utilities

For adapter implementations, there are utility functions:

```typescript
import {
  getBuildFunction,
  getParseFunction,
  getIsMatchFunction,
  getServerPattern
} from '@adi-family/http'

const buildFn = getBuildFunction(routeConfig)
const parseFn = getParseFunction(routeConfig)
const matchFn = getIsMatchFunction(routeConfig)
const pattern = getServerPattern(routeConfig)
```

## Complete Examples

### Basic CRUD Routes

```typescript
import { route } from '@adi-family/http'
import { z } from 'zod'

// List all users
export const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users')
} as const

// Get single user
export const getUserConfig = {
  method: 'GET',
  route: route.dynamic('/api/users/:id', z.object({ id: z.string() }))
} as const

// Create user
export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users')
} as const

// Update user
export const updateUserConfig = {
  method: 'PUT',
  route: route.dynamic('/api/users/:id', z.object({ id: z.string() }))
} as const

// Delete user
export const deleteUserConfig = {
  method: 'DELETE',
  route: route.dynamic('/api/users/:id', z.object({ id: z.string() }))
} as const
```

### Nested Resources

```typescript
// Get project task
export const getProjectTaskConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/projects/:projectId/tasks/:taskId',
    z.object({
      projectId: z.string(),
      taskId: z.string()
    })
  )
} as const

// Create project task
export const createProjectTaskConfig = {
  method: 'POST',
  route: route.dynamic(
    '/api/projects/:projectId/tasks',
    z.object({ projectId: z.string() })
  )
} as const
```

### Multi-Tenant Architecture

```typescript
export const getTenantUserConfig = {
  method: 'GET',
  route: route.full({
    params: z.object({
      tenantId: z.string(),
      userId: z.string()
    }),
    build: (params) =>
      `/api/users/${params.userId}?tenant=${params.tenantId}`,
    parse: (url) => ({
      userId: url.pathname.split('/').pop()!,
      tenantId: url.searchParams.get('tenant')!
    }),
    is: (url) =>
      /^\/api\/users\/[^/]+$/.test(url.pathname) &&
      url.searchParams.has('tenant')
  })
} as const
```

### API Versioning

```typescript
export const getV2UserConfig = {
  method: 'GET',
  route: route.withBuilder({
    pattern: '/api/v:version/users/:id',
    params: z.object({
      version: z.literal(2),
      id: z.string()
    }),
    build: (params) => `/api/v2/users/${params.id}`
  })
} as const

export const getV1UserConfig = {
  method: 'GET',
  route: route.withBuilder({
    pattern: '/api/v:version/users/:id',
    params: z.object({
      version: z.literal(1),
      id: z.string()
    }),
    build: (params) => `/api/legacy/users/${params.id}`
  })
} as const
```

## Client Usage

All route types work seamlessly with the client:

```typescript
import { BaseClient } from '@adi-family/http'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

// Static route
await client.run(listUsersConfig, {})

// Dynamic route
await client.run(getUserConfig, {
  params: { id: '123' }
})

// Custom builder route
await client.run(getV2UserConfig, {
  params: { version: 2, id: '123' }
})

// Full custom route
await client.run(getTenantUserConfig, {
  params: { tenantId: 'acme', userId: '123' }
})
```

## Server Usage

All route types work with any adapter:

```typescript
import { handler } from '@adi-family/http'
import { serveExpress } from '@adi-family/http-express'

const getUserHandler = handler(getUserConfig, async (ctx) => {
  return await db.users.findById(ctx.params.id)
})

const getTenantUserHandler = handler(getTenantUserConfig, async (ctx) => {
  return await db.users.findOne({
    id: ctx.params.userId,
    tenantId: ctx.params.tenantId
  })
})

serveExpress(app, [getUserHandler, getTenantUserHandler])
```

## Best Practices

### 1. Start Simple

Use the simplest route type that meets your needs:

```typescript
// ✅ Good - Static route for simple endpoint
route: route.static('/api/users')

// ❌ Over-engineered - Don't use full() when static() works
route: route.full({
  params: z.object({}),
  build: () => '/api/users',
  parse: () => ({}),
  is: (url) => url.pathname === '/api/users'
})
```

### 2. Prefer Dynamic Over Custom

Use `dynamic()` for standard parameter patterns:

```typescript
// ✅ Good - Simple and clear
route: route.dynamic('/api/users/:id', z.object({ id: z.string() }))

// ❌ Unnecessary - Don't use withBuilder() for simple patterns
route: route.withBuilder({
  pattern: '/api/users/:id',
  params: z.object({ id: z.string() }),
  build: (params) => `/api/users/${params.id}`
})
```

### 3. Use full() Only When Needed

Reserve `full()` for truly custom routing:

```typescript
// ✅ Good use of full() - Non-standard parameter location
route: route.full({
  params: z.object({ tenantId: z.string(), userId: z.string() }),
  build: (params) => `/api/users/${params.userId}?tenant=${params.tenantId}`,
  parse: (url) => ({
    userId: url.pathname.split('/').pop()!,
    tenantId: url.searchParams.get('tenant')!
  }),
  is: (url) => /^\/api\/users\/[^/]+$/.test(url.pathname) && url.searchParams.has('tenant')
})
```

### 4. Consistent Parameter Naming

Use consistent naming across routes:

```typescript
// ✅ Good - Consistent naming
route.dynamic('/api/projects/:projectId', z.object({ projectId: z.string() }))
route.dynamic('/api/projects/:projectId/tasks/:taskId', z.object({ projectId: z.string(), taskId: z.string() }))

// ❌ Bad - Inconsistent naming
route.dynamic('/api/projects/:id', z.object({ id: z.string() }))
route.dynamic('/api/projects/:projectId/tasks/:id', z.object({ projectId: z.string(), id: z.string() }))
```

## Next Steps

- [Route Builder](/guide/route-builder) - Learn more about the route builder API
- [Handlers](/guide/handlers) - Use routes in server handlers
- [Client](/guide/client) - Use routes in client calls

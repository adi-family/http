# Advanced Routing Examples

This guide covers advanced routing patterns including nested resources, API versioning, multi-tenant architectures, and custom route logic.

## Nested Resources

Handle deeply nested REST resources with type-safe parameter extraction.

### Three-Level Nesting

```typescript
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

// GET /api/orgs/:orgId/teams/:teamId/members/:memberId
export const getTeamMemberConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/orgs/:orgId/teams/:teamId/members/:memberId',
    z.object({
      orgId: z.string(),
      teamId: z.string(),
      memberId: z.string()
    })
  ),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.enum(['owner', 'admin', 'member']),
      teamId: z.string(),
      orgId: z.string()
    })
  }
} as const satisfies HandlerConfig

// POST /api/orgs/:orgId/teams/:teamId/members
export const addTeamMemberConfig = {
  method: 'POST',
  route: route.dynamic(
    '/api/orgs/:orgId/teams/:teamId/members',
    z.object({
      orgId: z.string(),
      teamId: z.string()
    })
  ),
  body: {
    schema: z.object({
      userId: z.string(),
      role: z.enum(['admin', 'member']).default('member')
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      userId: z.string(),
      role: z.string(),
      addedAt: z.string().datetime()
    })
  }
} as const satisfies HandlerConfig
```

### Handler Implementation

```typescript
import { handler } from '@adi-family/http'

export const getTeamMemberHandler = handler(getTeamMemberConfig, async (ctx) => {
  const { orgId, teamId, memberId } = ctx.params

  // Verify org exists
  const org = await db.orgs.findById(orgId)
  if (!org) throw new Error('Organization not found')

  // Verify team belongs to org
  const team = await db.teams.findOne({ id: teamId, orgId })
  if (!team) throw new Error('Team not found')

  // Get member
  const member = await db.members.findOne({
    id: memberId,
    teamId,
    orgId
  })
  if (!member) throw new Error('Member not found')

  return member
})

export const addTeamMemberHandler = handler(addTeamMemberConfig, async (ctx) => {
  const { orgId, teamId } = ctx.params
  const { userId, role } = ctx.body

  // Verify permissions, etc.
  const member = await db.members.create({
    userId,
    teamId,
    orgId,
    role,
    addedAt: new Date().toISOString()
  })

  return member
})
```

## API Versioning

Support multiple API versions with custom routing logic.

### Version-Based Routing

```typescript
// V2 API - New structure
export const getUserV2Config = {
  method: 'GET',
  route: route.withBuilder({
    pattern: '/api/v:version/users/:id',
    params: z.object({
      version: z.literal(2),
      id: z.string()
    }),
    build: (params) => `/api/v2/users/${params.id}`
  }),
  response: {
    schema: z.object({
      id: z.string(),
      profile: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string()
      }),
      metadata: z.object({
        createdAt: z.string(),
        updatedAt: z.string()
      })
    })
  }
} as const satisfies HandlerConfig

// V1 API - Legacy structure
export const getUserV1Config = {
  method: 'GET',
  route: route.withBuilder({
    pattern: '/api/v:version/users/:id',
    params: z.object({
      version: z.literal(1),
      id: z.string()
    }),
    build: (params) => `/api/legacy/users/${params.id}`
  }),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      created_at: z.string()
    })
  }
} as const satisfies HandlerConfig
```

### Version Handlers

```typescript
export const getUserV2Handler = handler(getUserV2Config, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)
  if (!user) throw new Error('User not found')

  // Return new V2 structure
  return {
    id: user.id,
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    },
    metadata: {
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }
})

export const getUserV1Handler = handler(getUserV1Config, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)
  if (!user) throw new Error('User not found')

  // Return legacy V1 structure
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    created_at: user.createdAt
  }
})
```

## Multi-Tenant Architecture

Implement tenant isolation using query parameters or subdomains.

### Tenant via Query Parameter

```typescript
export const getTenantResourceConfig = {
  method: 'GET',
  route: route.full({
    params: z.object({
      tenantId: z.string(),
      resourceId: z.string()
    }),
    build: (params) =>
      `/api/resources/${params.resourceId}?tenant=${params.tenantId}`,
    parse: (url) => ({
      resourceId: url.pathname.split('/').pop()!,
      tenantId: url.searchParams.get('tenant')!
    }),
    is: (url) =>
      /^\/api\/resources\/[^/]+$/.test(url.pathname) &&
      url.searchParams.has('tenant')
  }),
  response: {
    schema: z.object({
      id: z.string(),
      tenantId: z.string(),
      name: z.string(),
      data: z.record(z.unknown())
    })
  }
} as const satisfies HandlerConfig

export const getTenantResourceHandler = handler(getTenantResourceConfig, async (ctx) => {
  const { tenantId, resourceId } = ctx.params

  // Verify tenant access
  const tenant = await db.tenants.findById(tenantId)
  if (!tenant) throw new Error('Tenant not found')

  // Get resource scoped to tenant
  const resource = await db.resources.findOne({
    id: resourceId,
    tenantId
  })
  if (!resource) throw new Error('Resource not found')

  return resource
})
```

## Custom URL Patterns

### Geographic Coordinates

```typescript
export const getLocationConfig = {
  method: 'GET',
  route: route.full({
    params: z.object({
      coords: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180)
      })
    }),
    build: (params) =>
      `/api/locations/${params.coords.lat},${params.coords.lng}`,
    parse: (url) => {
      const [lat, lng] = url.pathname
        .split('/').pop()!
        .split(',')
        .map(Number)
      return { coords: { lat, lng } }
    },
    is: (url) =>
      /^\/api\/locations\/[\d.-]+,[\d.-]+$/.test(url.pathname)
  }),
  query: {
    schema: z.object({
      radius: z.number().min(1).max(100).optional().default(10)
    })
  },
  response: {
    schema: z.object({
      coords: z.object({ lat: z.number(), lng: z.number() }),
      places: z.array(z.object({
        name: z.string(),
        distance: z.number()
      }))
    })
  }
} as const satisfies HandlerConfig
```

### Date Range URLs

```typescript
export const getDateRangeReportConfig = {
  method: 'GET',
  route: route.full({
    params: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    }),
    build: (params) =>
      `/api/reports/${params.startDate}..${params.endDate}`,
    parse: (url) => {
      const [startDate, endDate] = url.pathname
        .split('/').pop()!
        .split('..')
      return { startDate, endDate }
    },
    is: (url) =>
      /^\/api\/reports\/\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(url.pathname)
  }),
  response: {
    schema: z.object({
      startDate: z.string(),
      endDate: z.string(),
      metrics: z.record(z.number())
    })
  }
} as const satisfies HandlerConfig
```

## Conditional Routing

Route to different endpoints based on parameters.

### Feature Flags

```typescript
export const getFeatureConfig = {
  method: 'GET',
  route: route.withBuilder({
    pattern: '/api/:feature/:id',
    params: z.object({
      feature: z.enum(['stable', 'beta', 'alpha']),
      id: z.string()
    }),
    build: (params) => {
      // Route beta/alpha to different endpoint
      if (params.feature === 'stable') {
        return `/api/stable/${params.id}`
      }
      return `/api/experimental/${params.feature}/${params.id}`
    }
  })
} as const satisfies HandlerConfig
```

### A/B Testing Routes

```typescript
export const getExperimentConfig = {
  method: 'GET',
  route: route.withBuilder({
    pattern: '/api/experiments/:variant/content/:id',
    params: z.object({
      variant: z.enum(['A', 'B']),
      id: z.string()
    }),
    build: (params) => {
      if (params.variant === 'A') {
        return `/api/content/${params.id}?variant=control`
      }
      return `/api/content/v2/${params.id}?variant=test`
    }
  })
} as const satisfies HandlerConfig
```

## Complex Query Patterns

### Search with Filters

```typescript
export const searchProductsConfig = {
  method: 'GET',
  route: route.static('/api/products/search'),
  query: {
    schema: z.object({
      q: z.string().min(1),
      category: z.string().optional(),
      minPrice: z.number().min(0).optional(),
      maxPrice: z.number().min(0).optional(),
      inStock: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      sortBy: z.enum(['price', 'name', 'rating']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20)
    }).refine(
      (data) => {
        if (data.minPrice && data.maxPrice) {
          return data.minPrice <= data.maxPrice
        }
        return true
      },
      { message: 'minPrice must be less than or equal to maxPrice' }
    )
  },
  response: {
    schema: z.object({
      results: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        inStock: z.boolean()
      })),
      total: z.number(),
      page: z.number(),
      limit: z.number()
    })
  }
} as const satisfies HandlerConfig
```

## Client Usage

All advanced patterns work seamlessly with the client:

```typescript
import { BaseClient } from '@adi-family/http'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

// Nested resources
const member = await client.run(getTeamMemberConfig, {
  params: {
    orgId: 'org-123',
    teamId: 'team-456',
    memberId: 'member-789'
  }
})

// API versioning
const userV2 = await client.run(getUserV2Config, {
  params: { version: 2, id: 'user-123' }
})

// Multi-tenant
const resource = await client.run(getTenantResourceConfig, {
  params: { tenantId: 'acme', resourceId: 'res-123' }
})

// Custom patterns
const location = await client.run(getLocationConfig, {
  params: { coords: { lat: 37.7749, lng: -122.4194 } },
  query: { radius: 5 }
})

// Complex search
const products = await client.run(searchProductsConfig, {
  query: {
    q: 'laptop',
    category: 'electronics',
    minPrice: 500,
    maxPrice: 2000,
    inStock: true,
    sortBy: 'price',
    sortOrder: 'asc'
  }
})
```

## Best Practices

### 1. Keep Routes RESTful When Possible

```typescript
// ✅ Good - Standard REST pattern
route.dynamic('/api/users/:id', z.object({ id: z.string() }))

// ❌ Avoid - Unless you have a specific need
route.full({
  params: z.object({ id: z.string() }),
  build: (params) => `/api/users?id=${params.id}`,
  // ...
})
```

### 2. Validate Business Context in Handlers

```typescript
// ✅ Good - Validate hierarchy in handler
export const handler = handler(getTeamMemberConfig, async (ctx) => {
  // Verify team belongs to org
  const team = await db.teams.findOne({
    id: ctx.params.teamId,
    orgId: ctx.params.orgId
  })
  if (!team) throw new Error('Team not found in organization')

  // Continue with member lookup...
})
```

### 3. Use Consistent Parameter Naming

```typescript
// ✅ Good - Consistent naming
route.dynamic('/api/orgs/:orgId/teams/:teamId', ...)
route.dynamic('/api/orgs/:orgId/projects/:projectId', ...)

// ❌ Bad - Inconsistent
route.dynamic('/api/orgs/:id/teams/:teamId', ...)
route.dynamic('/api/orgs/:orgId/projects/:id', ...)
```

## Next Steps

- [Basic Examples](/examples/basic) - Start with simple CRUD
- [Authentication](/examples/auth) - Add authentication
- [Custom Routes Guide](/guide/custom-routes) - Deep dive into route builder

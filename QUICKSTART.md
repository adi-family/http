# Quick Start Guide

quickstart, getting-started, tutorial

Get started with @adi-utils/http in 5 minutes.

## Step 1: Install Dependencies

```bash
# Core packages
bun add @adi-utils/http @adi-utils/http-express zod

# Dev dependencies
bun add -D @types/express express
```

## Step 2: Create Project Structure

```bash
mkdir -p packages/{api-contracts,backend/handlers,client/api}
```

## Step 3: Define Your First Config

```typescript
// packages/api-contracts/users.ts
import { z } from 'zod'
import type { HandlerConfig } from '@adi-utils/http'

export const getUserConfig = {
  method: 'GET',
  params: {
    schema: z.object({ id: z.string() }),
    pattern: '/api/users/:id',
    build: (params) => `/api/users/${params.id}`
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    })
  }
} as const satisfies HandlerConfig
```

## Step 4: Implement Server Handler

```typescript
// packages/backend/handlers/users.ts
import { handler } from '@adi-utils/http'
import { getUserConfig } from '@api-contracts/users'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  // Your business logic here
  const user = await db.users.findById(ctx.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  return user
})
```

## Step 5: Serve with Express

```typescript
// packages/backend/index.ts
import express from 'express'
import { serveExpress } from '@adi-utils/http-express'
import { getUserHandler } from './handlers/users'

const app = express()
app.use(express.json())

serveExpress(app, [getUserHandler])

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## Step 6: Use in Client

```typescript
// packages/client/api/users.ts
import { BaseClient } from '@adi-utils/http'
import { getUserConfig } from '@api-contracts/users'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

// Fully type-safe!
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})

console.log(user.name) // TypeScript knows this exists!
```

## Next Steps

- Check out [README.md](./README.md) for complete documentation
- See [examples/](./examples/) for more complex use cases
- Learn about error handling, middleware, and validation

## Common Patterns

### POST with Body

```typescript
export const createUserConfig = {
  method: 'POST',
  url: '/api/users',
  body: {
    schema: z.object({
      name: z.string(),
      email: z.string().email()
    })
  },
  response: {
    schema: z.object({ id: z.string() })
  }
} as const satisfies HandlerConfig
```

### GET with Query Params

```typescript
export const listUsersConfig = {
  method: 'GET',
  url: '/api/users',
  query: {
    schema: z.object({
      page: z.number().optional(),
      limit: z.number().optional()
    })
  },
  response: {
    schema: z.array(z.object({ id: z.string(), name: z.string() }))
  }
} as const satisfies HandlerConfig
```

### Nested Routes

```typescript
export const getUserPostConfig = {
  method: 'GET',
  params: {
    schema: z.object({
      userId: z.string(),
      postId: z.string()
    }),
    pattern: '/api/users/:userId/posts/:postId',
    build: (params) => `/api/users/${params.userId}/posts/${params.postId}`
  },
  response: {
    schema: z.object({ id: z.string(), title: z.string() })
  }
} as const satisfies HandlerConfig
```

## Tips

1. **Always use `as const satisfies HandlerConfig`** for proper type inference
2. **Export configs from `@api-contracts`** for sharing between client/server
3. **Don't validate params** - they're only for URL building
4. **Validate body and query** - use Zod schemas for safety
5. **Keep configs simple** - no complex logic in configs

# Getting Started

Get up and running with @adi-family/http in 5 minutes.

## Installation

Install the core library and your preferred adapter:

::: code-group

```bash [npm]
# Core library
npm install @adi-family/http zod

# Choose an adapter
npm install @adi-family/http-express  # For Express
# or
npm install @adi-family/http-native   # For Native Node.js
```

```bash [bun]
# Core library
bun add @adi-family/http zod

# Choose an adapter
bun add @adi-family/http-express  # For Express
# or
bun add @adi-family/http-native   # For Native Node.js
```

:::

## Project Structure

We recommend organizing your project like this:

```
your-project/
├── packages/
│   ├── api-contracts/     # Shared API contracts
│   │   ├── users.ts
│   │   └── projects.ts
│   ├── backend/           # Server implementation
│   │   └── handlers/
│   │       ├── users.ts
│   │       └── projects.ts
│   └── client/            # Client application
│       └── api/
│           └── users.ts
```

## Quick Start

### 1. Define Your First Route

Create a contract that both client and server will use:

```typescript
// packages/api-contracts/users.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

export const getUserConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/users/:id',
    z.object({ id: z.string() })
  ),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    })
  }
} as const satisfies HandlerConfig
```

### 2. Implement the Server Handler

```typescript
// packages/backend/handlers/users.ts
import { handler } from '@adi-family/http'
import { getUserConfig } from '@api-contracts/users'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  // ctx.params is fully typed!
  const user = await db.users.findById(ctx.params.id)

  if (!user) {
    throw new Error('User not found')
  }

  return user // Response is type-checked!
})
```

### 3. Serve with Express

```typescript
// packages/backend/index.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { getUserHandler } from './handlers/users'

const app = express()
app.use(express.json())

serveExpress(app, [getUserHandler])

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

**Or with Native HTTP:**

```typescript
// packages/backend/index.ts
import { serveNative } from '@adi-family/http-native'
import { getUserHandler } from './handlers/users'

const server = serveNative([getUserHandler], {
  port: 3000,
  hostname: '0.0.0.0',
  onListen: (port, hostname) => {
    console.log(`Server running on http://${hostname}:${port}`)
  }
})
```

### 4. Use in Client

```typescript
// packages/client/api/users.ts
import { BaseClient } from '@adi-family/http'
import { getUserConfig } from '@api-contracts/users'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000',
  headers: {
    Authorization: `Bearer ${token}`
  }
})

// Fully type-safe!
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})

console.log(user.name)  // ✅ TypeScript knows this exists
console.log(user.age)   // ❌ TypeScript error - property doesn't exist
```

## Next Steps

Now that you have a basic setup:

- **[Route Builder](/guide/route-builder)** - Learn about the powerful route builder API
- **[Handlers](/guide/handlers)** - Deep dive into handler functions
- **[Validation](/guide/validation)** - Understand Zod validation
- **[Examples](/examples/basic)** - See more practical examples

## Common Patterns

### POST with Body

```typescript
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
    schema: z.object({ id: z.string() })
  }
} as const satisfies HandlerConfig
```

### GET with Query Parameters

```typescript
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
      name: z.string()
    }))
  }
} as const satisfies HandlerConfig
```

### Multiple URL Parameters

```typescript
export const getTaskConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/projects/:projectId/tasks/:taskId',
    z.object({
      projectId: z.string(),
      taskId: z.string()
    })
  ),
  response: {
    schema: z.object({
      id: z.string(),
      title: z.string()
    })
  }
} as const satisfies HandlerConfig
```

## Tips

::: tip Always use `as const satisfies HandlerConfig`
This ensures proper type inference while maintaining type safety.
:::

::: tip Share contracts between client and server
Export configs from a shared `@api-contracts` package to keep client and server in sync.
:::

::: tip Don't validate URL params
URL params are only used for building paths. Validate `query` and `body` instead.
:::

::: tip Use Zod for validation
Zod provides excellent TypeScript integration and runtime validation.
:::

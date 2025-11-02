# Client

The `BaseClient` provides a type-safe HTTP client that automatically infers types from your handler configurations. It handles URL building, validation, and response parsing.

## Overview

The client uses the same handler configurations as the server, ensuring type safety end-to-end:

```typescript
import { BaseClient } from '@adi-family/http'
import { getUserConfig } from './contracts'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

// Fully type-safe!
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})

console.log(user.name) // TypeScript knows this exists
```

## Creating a Client

### Basic Configuration

```typescript
import { BaseClient } from '@adi-family/http'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})
```

### With Default Headers

```typescript
const client = new BaseClient({
  baseUrl: 'http://localhost:3000',
  headers: {
    'Authorization': 'Bearer your-token',
    'X-API-Version': '1.0'
  }
})
```

### With Custom Fetch

```typescript
const client = new BaseClient({
  baseUrl: 'http://localhost:3000',
  fetch: customFetch // Use a custom fetch implementation
})
```

## Making Requests

The `client.run()` method is used for all requests:

```typescript
const result = await client.run(handlerConfig, options)
```

### GET Requests

```typescript
// Simple GET
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})

// GET with query parameters
const users = await client.run(listUsersConfig, {
  query: { page: 1, limit: 20, search: 'john' }
})
```

### POST Requests

```typescript
const newUser = await client.run(createUserConfig, {
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
})
```

### PUT/PATCH Requests

```typescript
const updatedUser = await client.run(updateUserConfig, {
  params: { id: '123' },
  body: {
    name: 'Jane Doe',
    email: 'jane@example.com'
  }
})
```

### DELETE Requests

```typescript
await client.run(deleteUserConfig, {
  params: { id: '123' }
})
```

## Request Options

The second parameter to `client.run()` accepts:

```typescript
interface RunOptions<TParams, TQuery, TBody> {
  params?: TParams      // URL parameters
  query?: TQuery        // Query string parameters
  body?: TBody          // Request body
  headers?: Record<string, string>  // Additional headers
}
```

### Combining Options

```typescript
const task = await client.run(getProjectTaskConfig, {
  params: { projectId: '123', taskId: '456' },
  query: { include: 'comments' },
  headers: { 'X-Request-ID': 'abc123' }
})
```

## Type Safety

The client provides full type inference:

```typescript
// ✅ TypeScript knows the exact shape of the response
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})

user.name // ✅ string
user.email // ✅ string
user.invalid // ❌ TypeScript error

// ✅ TypeScript validates request parameters
await client.run(getUserConfig, {
  params: { id: 123 } // ❌ TypeScript error - should be string
})

// ✅ TypeScript validates query parameters
await client.run(listUsersConfig, {
  query: { limit: 'not a number' } // ❌ TypeScript error
})
```

## Error Handling

### Basic Error Handling

```typescript
try {
  const user = await client.run(getUserConfig, {
    params: { id: '123' }
  })
} catch (error) {
  console.error('Request failed:', error)
}
```

### HTTP Status Codes

```typescript
try {
  const user = await client.run(getUserConfig, {
    params: { id: '123' }
  })
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('404')) {
      console.error('User not found')
    } else if (error.message.includes('401')) {
      console.error('Unauthorized')
    } else if (error.message.includes('500')) {
      console.error('Server error')
    }
  }
}
```

### Validation Errors

The server returns validation errors with HTTP 400:

```typescript
try {
  await client.run(createUserConfig, {
    body: {
      name: '', // Invalid - too short
      email: 'not-an-email' // Invalid format
    }
  })
} catch (error) {
  // Server returned:
  // Status: 400
  // Body: {
  //   error: 'Validation failed',
  //   details: [
  //     { path: ['name'], message: 'String must contain at least 1 character(s)' },
  //     { path: ['email'], message: 'Invalid email' }
  //   ]
  // }
}
```

## Advanced Usage

### Custom Fetch with Retry Logic

```typescript
const retryClient = new BaseClient({
  baseUrl: 'http://localhost:3000',
  fetch: async (url, options) => {
    const maxRetries = 3
    const retryDelay = 1000

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options)

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`)
        }

        return response
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error
        }

        // Wait before retrying
        await new Promise(resolve =>
          setTimeout(resolve, retryDelay * (attempt + 1))
        )
      }
    }

    throw new Error('Max retries exceeded')
  }
})
```

### Request Interceptor

```typescript
const interceptClient = new BaseClient({
  baseUrl: 'http://localhost:3000',
  fetch: async (url, options) => {
    // Log request
    console.log(`${options?.method || 'GET'} ${url}`)

    // Add authentication
    const token = await getAuthToken()
    const headers = new Headers(options?.headers)
    headers.set('Authorization', `Bearer ${token}`)

    // Make request
    const response = await fetch(url, { ...options, headers })

    // Log response
    console.log(`Response: ${response.status}`)

    return response
  }
})
```

### Response Caching

```typescript
const cache = new Map<string, any>()

const cachedClient = new BaseClient({
  baseUrl: 'http://localhost:3000',
  fetch: async (url, options) => {
    const method = options?.method || 'GET'

    // Only cache GET requests
    if (method === 'GET') {
      const cacheKey = url.toString()

      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const response = await fetch(url, options)
      const data = await response.clone().json()
      cache.set(cacheKey, data)

      return response
    }

    return fetch(url, options)
  }
})
```

### Multiple Environments

```typescript
const createClient = (env: 'dev' | 'staging' | 'prod') => {
  const baseUrls = {
    dev: 'http://localhost:3000',
    staging: 'https://staging.api.example.com',
    prod: 'https://api.example.com'
  }

  return new BaseClient({
    baseUrl: baseUrls[env]
  })
}

const client = createClient(process.env.NODE_ENV === 'production' ? 'prod' : 'dev')
```

## Complete Example

### Shared Contracts

```typescript
// contracts/users.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

export const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users'),
  query: {
    schema: z.object({
      page: z.number().min(1).optional().default(1),
      limit: z.number().min(1).max(100).optional().default(10),
      search: z.string().optional()
    })
  },
  response: {
    schema: z.object({
      data: z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      })),
      total: z.number(),
      page: z.number(),
      limit: z.number()
    })
  }
} as const satisfies HandlerConfig

export const getUserConfig = {
  method: 'GET',
  route: route.dynamic('/api/users/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    })
  }
} as const satisfies HandlerConfig

export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string().min(1).max(255),
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

### Client Usage

```typescript
// client/users.ts
import { BaseClient } from '@adi-family/http'
import { listUsersConfig, getUserConfig, createUserConfig } from '../contracts/users'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000',
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  }
})

// List users with pagination
const users = await client.run(listUsersConfig, {
  query: { page: 1, limit: 20, search: 'john' }
})

console.log(`Found ${users.total} users`)
users.data.forEach(user => {
  console.log(`${user.name} (${user.email})`)
})

// Get single user
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})

console.log(user.name)

// Create user
const newUser = await client.run(createUserConfig, {
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
})

console.log(`Created user with ID: ${newUser.id}`)
```

## Best Practices

### 1. Share Contracts

Keep contracts in a shared package:

```typescript
// packages/contracts/users.ts
export const getUserConfig = { ... }

// packages/server/handlers/users.ts
import { getUserConfig } from '@your-org/contracts'

// packages/client/api/users.ts
import { getUserConfig } from '@your-org/contracts'
```

### 2. Create Client Wrapper

Wrap the client for easier usage:

```typescript
// client/api.ts
import { BaseClient } from '@adi-family/http'
import * as userConfigs from '../contracts/users'
import * as projectConfigs from '../contracts/projects'

class ApiClient {
  private client: BaseClient

  constructor(baseUrl: string, token?: string) {
    this.client = new BaseClient({
      baseUrl,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
  }

  users = {
    list: (query?: any) => this.client.run(userConfigs.listUsersConfig, { query }),
    get: (id: string) => this.client.run(userConfigs.getUserConfig, { params: { id } }),
    create: (body: any) => this.client.run(userConfigs.createUserConfig, { body })
  }

  projects = {
    list: () => this.client.run(projectConfigs.listProjectsConfig, {}),
    get: (id: string) => this.client.run(projectConfigs.getProjectConfig, { params: { id } })
  }
}

export const api = new ApiClient(process.env.API_URL!, process.env.API_TOKEN)
```

### 3. Handle Errors Consistently

```typescript
// client/utils.ts
export async function apiRequest<T>(
  fn: () => Promise<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fn()
    return { data }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: 'Unknown error' }
  }
}

// Usage
const { data, error } = await apiRequest(() =>
  client.run(getUserConfig, { params: { id: '123' } })
)

if (error) {
  console.error(error)
} else {
  console.log(data.name)
}
```

## Next Steps

- [Handlers](/guide/handlers) - Learn how to implement server-side handlers
- [Validation](/guide/validation) - Deep dive into Zod validation
- [Examples](/examples/basic) - See complete working examples

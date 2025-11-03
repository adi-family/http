# Testing

Comprehensive testing strategies for @adi-family/http applications.

## Testing Philosophy

@adi-family/http makes testing easier by separating concerns:

- **Configs** - Pure data objects, easy to test
- **Handlers** - Business logic with injected dependencies
- **Routes** - Integration tests for complete request/response flow

## Unit Testing Handlers

Test handler functions directly without HTTP layer:

### Basic Handler Test

```typescript
import { describe, it, expect, vi } from 'vitest'
import { handler } from '@adi-family/http'
import { getUserConfig } from '@api-contracts/users'

// Create handler
const getUserHandler = handler(getUserConfig, async (ctx) => {
  return await db.users.findById(ctx.params.id)
})

describe('getUserHandler', () => {
  it('returns user by id', async () => {
    // Mock context
    const ctx = {
      params: { id: '123' },
      query: {},
      body: {},
      headers: new Map(),
      url: new URL('http://test/api/users/123')
    }

    // Mock database
    const mockUser = { id: '123', name: 'Alice', email: 'alice@example.com' }
    vi.spyOn(db.users, 'findById').mockResolvedValue(mockUser)

    // Execute handler
    const result = await getUserHandler.execute(ctx)

    // Assert
    expect(result).toEqual(mockUser)
    expect(db.users.findById).toHaveBeenCalledWith('123')
  })

  it('throws error when user not found', async () => {
    const ctx = {
      params: { id: 'nonexistent' },
      query: {},
      body: {},
      headers: new Map(),
      url: new URL('http://test/api/users/nonexistent')
    }

    vi.spyOn(db.users, 'findById').mockResolvedValue(null)

    await expect(
      getUserHandler.execute(ctx)
    ).rejects.toThrow('User not found')
  })
})
```

### Testing with Query Parameters

```typescript
describe('listUsersHandler', () => {
  it('uses query parameters for pagination', async () => {
    const ctx = {
      params: {},
      query: { page: 2, limit: 20 },
      body: {},
      headers: new Map(),
      url: new URL('http://test/api/users?page=2&limit=20')
    }

    const mockUsers = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ]
    vi.spyOn(db.users, 'findAll').mockResolvedValue(mockUsers)

    const result = await listUsersHandler.execute(ctx)

    expect(result).toEqual(mockUsers)
    expect(db.users.findAll).toHaveBeenCalledWith({ page: 2, limit: 20 })
  })
})
```

### Testing with Request Body

```typescript
describe('createUserHandler', () => {
  it('creates user with valid data', async () => {
    const ctx = {
      params: {},
      query: {},
      body: {
        name: 'Alice',
        email: 'alice@example.com'
      },
      headers: new Map(),
      url: new URL('http://test/api/users')
    }

    const mockUser = { id: '123', ...ctx.body }
    vi.spyOn(db.users, 'create').mockResolvedValue(mockUser)

    const result = await createUserHandler.execute(ctx)

    expect(result).toEqual(mockUser)
    expect(db.users.create).toHaveBeenCalledWith(ctx.body)
  })
})
```

## Testing Middleware

Test middleware functions independently:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { requireAuth } from './middleware/auth'

describe('requireAuth middleware', () => {
  it('allows authenticated requests', async () => {
    const ctx = {
      params: {},
      query: {},
      body: {},
      headers: new Map([['Authorization', 'Bearer valid-token']]),
      url: new URL('http://test/api/users')
    }

    const next = vi.fn().mockResolvedValue({ success: true })

    await requireAuth(ctx, next)

    expect(next).toHaveBeenCalled()
  })

  it('rejects requests without auth header', async () => {
    const ctx = {
      params: {},
      query: {},
      body: {},
      headers: new Map(),
      url: new URL('http://test/api/users')
    }

    const next = vi.fn()

    await expect(
      requireAuth(ctx, next)
    ).rejects.toThrow('Unauthorized')

    expect(next).not.toHaveBeenCalled()
  })

  it('rejects requests with invalid token', async () => {
    const ctx = {
      params: {},
      query: {},
      body: {},
      headers: new Map([['Authorization', 'Bearer invalid-token']]),
      url: new URL('http://test/api/users')
    }

    const next = vi.fn()

    await expect(
      requireAuth(ctx, next)
    ).rejects.toThrow('Invalid token')
  })
})
```

## Testing Configs

Test that configs are correctly defined:

```typescript
import { describe, it, expect } from 'vitest'
import { getUserConfig, createUserConfig } from '@api-contracts/users'

describe('User configs', () => {
  it('getUserConfig has correct method', () => {
    expect(getUserConfig.method).toBe('GET')
  })

  it('getUserConfig has correct route', () => {
    expect(getUserConfig.route.type).toBe('pattern')
    expect(getUserConfig.route.pattern).toBe('/api/users/:id')
  })

  it('createUserConfig validates required fields', () => {
    const schema = createUserConfig.body.schema

    // Valid data passes
    expect(() => schema.parse({
      name: 'Alice',
      email: 'alice@example.com'
    })).not.toThrow()

    // Invalid data throws
    expect(() => schema.parse({
      name: '',
      email: 'not-an-email'
    })).toThrow()
  })
})
```

## Integration Testing

Test the complete request/response flow:

### Express Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { serveExpress } from '@adi-family/http-express'
import { getUserHandler, createUserHandler } from './handlers/users'

describe('User API Integration Tests', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use(express.json())

    serveExpress(app, [
      getUserHandler,
      createUserHandler
    ])
  })

  describe('GET /api/users/:id', () => {
    it('returns user by id', async () => {
      const response = await request(app)
        .get('/api/users/123')
        .expect(200)
        .expect('Content-Type', /json/)

      expect(response.body).toEqual({
        id: '123',
        name: 'Alice',
        email: 'alice@example.com'
      })
    })

    it('returns 404 for nonexistent user', async () => {
      const response = await request(app)
        .get('/api/users/nonexistent')
        .expect(404)

      expect(response.body.error).toBe('User not found')
    })
  })

  describe('POST /api/users', () => {
    it('creates new user', async () => {
      const newUser = {
        name: 'Bob',
        email: 'bob@example.com'
      }

      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect('Content-Type', /json/)

      expect(response.body).toMatchObject(newUser)
      expect(response.body.id).toBeDefined()
    })

    it('returns 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: '',
          email: 'invalid'
        })
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toHaveLength(2)
    })
  })
})
```

### Native HTTP Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { serveNative } from '@adi-family/http-native'
import { getUserHandler, createUserHandler } from './handlers/users'

describe('Native HTTP Integration Tests', () => {
  let server: any
  let baseUrl: string

  beforeAll(async () => {
    server = serveNative(
      [getUserHandler, createUserHandler],
      { port: 0 }  // Random port
    )

    await new Promise<void>((resolve) => {
      server.on('listening', () => {
        const addr = server.address()
        baseUrl = `http://localhost:${addr.port}`
        resolve()
      })
    })
  })

  afterAll(() => {
    server.close()
  })

  it('GET /api/users/:id returns user', async () => {
    const response = await fetch(`${baseUrl}/api/users/123`)

    expect(response.status).toBe(200)

    const user = await response.json()
    expect(user).toEqual({
      id: '123',
      name: 'Alice',
      email: 'alice@example.com'
    })
  })

  it('POST /api/users creates user', async () => {
    const response = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob',
        email: 'bob@example.com'
      })
    })

    expect(response.status).toBe(201)

    const user = await response.json()
    expect(user.name).toBe('Bob')
  })
})
```

## Testing with Client

Test using the type-safe client:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { BaseClient } from '@adi-family/http'
import { getUserConfig, createUserConfig } from '@api-contracts/users'
import { serveNative } from '@adi-family/http-native'

describe('Client Integration Tests', () => {
  let server: any
  let client: BaseClient

  beforeAll(async () => {
    server = serveNative([getUserHandler, createUserHandler], { port: 0 })

    await new Promise<void>((resolve) => {
      server.on('listening', () => {
        const addr = server.address()
        client = new BaseClient({
          baseUrl: `http://localhost:${addr.port}`
        })
        resolve()
      })
    })
  })

  afterAll(() => {
    server.close()
  })

  it('fetches user by id', async () => {
    const user = await client.run(getUserConfig, {
      params: { id: '123' }
    })

    expect(user).toEqual({
      id: '123',
      name: 'Alice',
      email: 'alice@example.com'
    })
  })

  it('creates new user', async () => {
    const newUser = await client.run(createUserConfig, {
      body: {
        name: 'Charlie',
        email: 'charlie@example.com'
      }
    })

    expect(newUser.name).toBe('Charlie')
    expect(newUser.id).toBeDefined()
  })
})
```

## Mocking Dependencies

### Database Mocks

```typescript
import { vi } from 'vitest'

// Mock entire module
vi.mock('../db/users', () => ({
  users: {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

// Use in tests
import * as db from '../db/users'

describe('getUserHandler', () => {
  it('calls database correctly', async () => {
    vi.spyOn(db.users, 'findById').mockResolvedValue({
      id: '123',
      name: 'Alice'
    })

    // ... test code
  })
})
```

### External API Mocks

```typescript
import { vi } from 'vitest'

vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

import fetch from 'node-fetch'

describe('external API handler', () => {
  it('calls external API', async () => {
    const mockFetch = fetch as any
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' })
    })

    // ... test code

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/data')
  })
})
```

## Test Helpers

Create reusable test utilities:

```typescript
// test/helpers.ts
import type { HandlerContext } from '@adi-family/http'

export function createMockContext<TParams, TQuery, TBody>(
  overrides?: Partial<HandlerContext<TParams, TQuery, TBody>>
): HandlerContext<TParams, TQuery, TBody> {
  return {
    params: {} as TParams,
    query: {} as TQuery,
    body: {} as TBody,
    headers: new Map(),
    url: new URL('http://test'),
    ...overrides
  }
}

export function createAuthContext<TParams, TQuery, TBody>(
  user: any,
  overrides?: Partial<HandlerContext<TParams, TQuery, TBody>>
) {
  const ctx = createMockContext(overrides)
  ;(ctx as any).user = user
  return ctx
}

// Usage
describe('handler tests', () => {
  it('tests with mock context', async () => {
    const ctx = createMockContext({
      params: { id: '123' },
      query: { page: 1 }
    })

    const result = await handler.execute(ctx)
    // ...
  })

  it('tests with auth context', async () => {
    const ctx = createAuthContext(
      { id: 'user-123', role: 'admin' },
      { params: { id: '123' } }
    )

    const result = await handler.execute(ctx)
    // ...
  })
})
```

## Snapshot Testing

Test response structure:

```typescript
import { describe, it, expect } from 'vitest'

describe('User API Snapshots', () => {
  it('matches user response structure', async () => {
    const response = await request(app)
      .get('/api/users/123')
      .expect(200)

    expect(response.body).toMatchSnapshot()
  })

  it('matches error response structure', async () => {
    const response = await request(app)
      .get('/api/users/nonexistent')
      .expect(404)

    expect(response.body).toMatchSnapshot()
  })
})
```

## Coverage

Run tests with coverage:

```bash
# Vitest
npm test -- --coverage

# Jest
npm test -- --coverage
```

Add coverage thresholds:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  }
})
```

## Testing Best Practices

### 1. Test Business Logic, Not Framework

```typescript
// ✅ Good - tests business logic
it('validates email uniqueness', async () => {
  const existing = await db.users.findByEmail('alice@example.com')
  expect(existing).toBeDefined()

  await expect(
    createUserHandler.execute({
      body: { email: 'alice@example.com' }
    })
  ).rejects.toThrow('Email already in use')
})

// ❌ Bad - tests HTTP framework
it('returns 409 status code', async () => {
  const response = await request(app).post('/api/users')
  expect(response.status).toBe(409)
})
```

### 2. Use Descriptive Test Names

```typescript
// ✅ Good
it('throws NotFoundError when user does not exist')
it('creates user with normalized email')
it('requires admin role to delete users')

// ❌ Bad
it('test 1')
it('works correctly')
it('error case')
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('updates user name', async () => {
  // Arrange
  const ctx = createMockContext({
    params: { id: '123' },
    body: { name: 'New Name' }
  })
  vi.spyOn(db.users, 'update').mockResolvedValue({
    id: '123',
    name: 'New Name'
  })

  // Act
  const result = await updateUserHandler.execute(ctx)

  // Assert
  expect(result.name).toBe('New Name')
  expect(db.users.update).toHaveBeenCalledWith('123', { name: 'New Name' })
})
```

### 4. Test Error Cases

```typescript
describe('error handling', () => {
  it('handles database errors', async () => {
    vi.spyOn(db.users, 'findById').mockRejectedValue(
      new Error('Database connection failed')
    )

    await expect(
      getUserHandler.execute(ctx)
    ).rejects.toThrow('Database connection failed')
  })

  it('handles validation errors', async () => {
    await expect(
      createUserHandler.execute({
        body: { name: '', email: 'invalid' }
      })
    ).rejects.toThrow('Validation failed')
  })
})
```

### 5. Clean Up After Tests

```typescript
import { afterEach, afterAll } from 'vitest'

afterEach(() => {
  // Clear mocks after each test
  vi.clearAllMocks()
})

afterAll(() => {
  // Close connections
  server.close()
  db.close()
})
```

## Example Test Suite

Complete example:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { serveExpress } from '@adi-family/http-express'
import * as handlers from './handlers/users'
import * as db from './db/users'

describe('User API', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use(express.json())
    serveExpress(app, Object.values(handlers))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users', () => {
    it('returns list of users', async () => {
      const mockUsers = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' }
      ]

      vi.spyOn(db.users, 'findAll').mockResolvedValue(mockUsers)

      const response = await request(app)
        .get('/api/users')
        .expect(200)

      expect(response.body).toEqual(mockUsers)
    })

    it('supports pagination', async () => {
      vi.spyOn(db.users, 'findAll').mockResolvedValue([])

      await request(app)
        .get('/api/users?page=2&limit=10')
        .expect(200)

      expect(db.users.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 })
    })
  })

  describe('POST /api/users', () => {
    it('creates new user', async () => {
      const newUser = { name: 'Charlie', email: 'charlie@example.com' }
      const createdUser = { id: '3', ...newUser }

      vi.spyOn(db.users, 'create').mockResolvedValue(createdUser)

      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201)

      expect(response.body).toEqual(createdUser)
    })

    it('validates email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Test', email: 'invalid-email' })
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })
  })
})
```

## Next Steps

- **[Examples](/examples/basic)** - See complete examples with tests
- **[Error Handling](/guide/error-handling)** - Test error scenarios
- **[Middleware](/guide/middleware)** - Test middleware functions

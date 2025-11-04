# Mock Generation

The `@adi-family/http-mocks` package provides powerful mock generation utilities for testing your HTTP handlers and clients without making real network requests.

## Installation

```bash
npm install @adi-family/http-mocks
# or
bun add @adi-family/http-mocks
```

## Why Use Mocks?

Mocks are essential for:

- **Fast Tests**: No network overhead
- **Reliable Tests**: No external dependencies
- **Offline Development**: Work without backend services
- **Edge Case Testing**: Easily simulate error conditions
- **Deterministic Tests**: Reproducible results every time

## Frontend Development & Debugging

Mock generation is incredibly powerful for frontend developers. Here's how to use it to debug and develop your UI independently.

### The Problem

As a frontend developer, you often face these challenges:

- Backend API not ready yet
- Need to test edge cases (empty lists, error states, loading states)
- Backend is slow or unstable during development
- Want to work offline (on a plane, coffee shop with bad wifi)
- Need consistent data for visual testing
- Difficult to reproduce specific scenarios

### The Solution

Use `MockClient` during development and seamlessly switch to the real client for production:

```typescript
// src/api/client.ts
import { BaseClient } from '@adi-family/http';
import { MockClient } from '@adi-family/http-mocks';

const isDevelopment = import.meta.env.DEV;
const useMocks = isDevelopment && localStorage.getItem('useMocks') === 'true';

export const apiClient = useMocks
  ? new MockClient({
      delay: 500, // Simulate network latency
      mockOptions: { seed: 42 } // Consistent data
    })
  : new BaseClient({
      baseUrl: import.meta.env.VITE_API_URL
    });

// Toggle mocks from browser console:
// localStorage.setItem('useMocks', 'true')
// Then refresh the page
```

### Quick Start for Frontend Developers

1. **Install the package**:

```bash
npm install @adi-family/http-mocks
```

2. **Create a development client**:

```typescript
// src/api/dev-client.ts
import { MockClient } from '@adi-family/http-mocks';
import { getUserConfig, getProjectsConfig, createProjectConfig } from './configs';

export const devClient = new MockClient({ delay: 300 });

// Register realistic mock data
devClient.register(getUserConfig, {
  id: 'dev-user-1',
  name: 'Dev User',
  email: 'dev@example.com',
  avatar: 'https://i.pravatar.cc/150?u=dev'
});

devClient.register(getProjectsConfig, {
  projects: [
    {
      id: '1',
      name: 'Project Alpha',
      status: 'active',
      progress: 75
    },
    {
      id: '2',
      name: 'Project Beta',
      status: 'pending',
      progress: 20
    }
  ]
});

// Dynamic responses based on request
devClient.register(createProjectConfig, ({ body }) => ({
  id: `project-${Date.now()}`,
  name: body.name,
  status: 'pending',
  progress: 0,
  createdAt: new Date().toISOString()
}));
```

3. **Use it in your app**:

```typescript
// src/hooks/useProjects.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { getProjectsConfig, createProjectConfig } from '../api/configs';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.run(getProjectsConfig)
  });
}

export function useCreateProject() {
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiClient.run(createProjectConfig, { body: data })
  });
}
```

### Debugging Specific Scenarios

#### Empty States

```typescript
// Test how your UI looks with no data
devClient.register(getProjectsConfig, { projects: [] });
```

#### Loading States

```typescript
// Simulate slow network
const slowClient = new MockClient({ delay: 3000 });
```

#### Error States

```typescript
// Simulate errors
devClient.register(getUserConfig, () => {
  throw new Error('Failed to fetch user');
});
```

#### Edge Cases

```typescript
// Long text
devClient.register(getProjectConfig, {
  id: '1',
  name: 'A'.repeat(100), // Very long name
  description: 'B'.repeat(1000) // Very long description
});

// Special characters
devClient.register(getProjectConfig, {
  id: '1',
  name: '🚀 Project <script>alert("xss")</script>',
  description: 'Test & "special" \'characters\''
});

// Large datasets
devClient.register(getProjectsConfig, {
  projects: Array.from({ length: 1000 }, (_, i) => ({
    id: `${i}`,
    name: `Project ${i}`,
    status: i % 3 === 0 ? 'active' : 'pending',
    progress: Math.floor(Math.random() * 100)
  }))
});
```

### Development Mode Toggle

Create a dev tools panel to easily switch between mock and real data:

```typescript
// src/components/DevTools.tsx
import { useState, useEffect } from 'react';

export function DevTools() {
  const [useMocks, setUseMocks] = useState(
    localStorage.getItem('useMocks') === 'true'
  );

  const toggle = () => {
    const newValue = !useMocks;
    localStorage.setItem('useMocks', String(newValue));
    setUseMocks(newValue);
    window.location.reload(); // Reload to apply changes
  };

  if (import.meta.env.PROD) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      padding: 12,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      borderRadius: 8,
      fontSize: 12,
      zIndex: 9999
    }}>
      <label>
        <input
          type="checkbox"
          checked={useMocks}
          onChange={toggle}
        />
        {' '}Use Mock Data
      </label>
    </div>
  );
}
```

### Framework-Specific Examples

#### React with TanStack Query

```typescript
// src/api/client.ts
import { MockClient } from '@adi-family/http-mocks';
import { BaseClient } from '@adi-family/http';

const isDev = import.meta.env.DEV;
const useMocks = isDev && localStorage.getItem('useMocks') !== 'false'; // Default to mocks in dev

const mockClient = new MockClient({
  delay: 500,
  mockOptions: { seed: 42 }
});

const realClient = new BaseClient({
  baseUrl: import.meta.env.VITE_API_URL
});

export const client = useMocks ? mockClient : realClient;

// src/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { client } from '../api/client';
import { getUserConfig } from '../api/configs';

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => client.run(getUserConfig, { params: { id } })
  });
}
```

#### Vue with VueQuery

```typescript
// src/api/client.ts
import { MockClient } from '@adi-family/http-mocks';
import { BaseClient } from '@adi-family/http';

const isDev = import.meta.env.DEV;
const useMocks = isDev && localStorage.getItem('useMocks') !== 'false';

export const client = useMocks
  ? new MockClient({ delay: 500 })
  : new BaseClient({ baseUrl: import.meta.env.VITE_API_URL });

// src/composables/useUser.ts
import { useQuery } from '@tanstack/vue-query';
import { client } from '../api/client';
import { getUserConfig } from '../api/configs';

export function useUser(id: Ref<string>) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => client.run(getUserConfig, { params: { id.value } })
  });
}
```

#### Svelte with TanStack Query

```typescript
// src/lib/api/client.ts
import { MockClient } from '@adi-family/http-mocks';
import { BaseClient } from '@adi-family/http';
import { browser } from '$app/environment';
import { dev } from '$app/environment';

const useMocks = browser && dev &&
  localStorage.getItem('useMocks') !== 'false';

export const client = useMocks
  ? new MockClient({ delay: 500 })
  : new BaseClient({ baseUrl: import.meta.env.VITE_API_URL });
```

### Pro Tips for Frontend Debugging

#### 1. Create a Mock Data Factory

```typescript
// src/api/mocks/factories.ts
import { MockClient } from '@adi-family/http-mocks';

export function createUserMock(overrides = {}) {
  return {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://i.pravatar.cc/150?u=john',
    role: 'user',
    ...overrides
  };
}

export function createProjectMock(overrides = {}) {
  return {
    id: 'project-1',
    name: 'Sample Project',
    status: 'active' as const,
    progress: 50,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

// Use in your dev client
devClient.register(getUserConfig, createUserMock());
devClient.register(getUserConfig, createUserMock({ role: 'admin' })); // Admin variant
```

#### 2. Test Different User Roles

```typescript
// Switch between different user types
const mockClient = new MockClient();

// Regular user
mockClient.register(getCurrentUserConfig, {
  id: '1',
  role: 'user',
  permissions: ['read']
});

// Admin user (set in localStorage and reload)
if (localStorage.getItem('userRole') === 'admin') {
  mockClient.register(getCurrentUserConfig, {
    id: '1',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin']
  });
}
```

#### 3. Simulate Realistic Pagination

```typescript
devClient.register(getProjectsConfig, ({ query }) => {
  const page = query?.page ?? 1;
  const limit = query?.limit ?? 20;
  const total = 100;

  return {
    projects: Array.from({ length: limit }, (_, i) => ({
      id: `${(page - 1) * limit + i}`,
      name: `Project ${(page - 1) * limit + i + 1}`,
      status: 'active'
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
});
```

#### 4. Debug Race Conditions

```typescript
// Vary response times to catch race conditions
const unpredictableClient = new MockClient();

unpredictableClient.register(getUserConfig, async ({ params }) => {
  // Random delay between 100-2000ms
  await new Promise(resolve =>
    setTimeout(resolve, 100 + Math.random() * 1900)
  );

  return {
    id: params.id,
    name: `User ${params.id}`
  };
});
```

#### 5. Visual Regression Testing

```typescript
// Use deterministic mocks for consistent screenshots
const visualTestClient = new MockClient({
  mockOptions: {
    seed: 12345, // Same seed = same data every time
    stringLength: 10,
    arrayLength: 5
  }
});

// Perfect for visual regression tests with tools like Percy, Chromatic, etc.
```

### Integration with Storybook

```typescript
// .storybook/preview.ts
import { MockClient } from '@adi-family/http-mocks';
import type { Preview } from '@storybook/react';

const mockClient = new MockClient({
  mockOptions: { seed: 42 }
});

// Make available globally
(window as any).__mockClient = mockClient;

// In your stories
import { getUserConfig } from '../api/configs';

export default {
  title: 'Components/UserProfile',
  component: UserProfile
};

export const Default = {
  beforeEach: () => {
    const mockClient = (window as any).__mockClient;
    mockClient.clear();
    mockClient.register(getUserConfig, {
      id: '1',
      name: 'Story User',
      email: 'story@example.com'
    });
  }
};

export const LongName = {
  beforeEach: () => {
    const mockClient = (window as any).__mockClient;
    mockClient.clear();
    mockClient.register(getUserConfig, {
      id: '1',
      name: 'A'.repeat(50),
      email: 'story@example.com'
    });
  }
};
```

### Debugging Checklist

When debugging frontend issues with mocks:

- [ ] Test with empty data (`[]`, `null`, `undefined`)
- [ ] Test with minimal data (1 item)
- [ ] Test with maximum data (1000+ items)
- [ ] Test with very long strings (overflow text)
- [ ] Test with special characters (`<>`, `"'`, emoji)
- [ ] Test with slow network (high delay)
- [ ] Test with fast network (no delay)
- [ ] Test error states (throw errors)
- [ ] Test loading states (high delay + skeleton)
- [ ] Test different user roles/permissions
- [ ] Test pagination edge cases (first page, last page, empty page)
- [ ] Test sorting and filtering
- [ ] Test race conditions (random delays)

## Mock Client

The `MockClient` is a drop-in replacement for `BaseClient` that returns mock data instead of making HTTP requests.

### Basic Usage

```typescript
import { MockClient } from '@adi-family/http-mocks';
import { getUserConfig } from './configs';

const mockClient = new MockClient();

// Register a mock response
mockClient.register(getUserConfig, {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
});

// Use it like a normal client
const user = await mockClient.run(getUserConfig, {
  params: { id: '123' }
});
```

### Auto-Generated Mocks

If you don't register a specific response, data is automatically generated from your Zod schemas:

```typescript
const mockClient = new MockClient();

// No registration needed!
const user = await mockClient.run(getUserConfig, {
  params: { id: '123' }
});

// Returns automatically generated data matching your schema:
// {
//   id: "aBcD123456",
//   name: "xYzAbC7890",
//   email: "user1234@example.com"
// }
```

### Dynamic Responses

Use functions to create dynamic responses based on request data:

```typescript
mockClient.register(getProjectConfig, ({ params, query, body }) => ({
  id: params.id,
  name: `Project ${params.id}`,
  status: query.status ?? 'active',
  createdAt: new Date()
}));
```

### Configuration Options

```typescript
const mockClient = new MockClient({
  // Options for mock data generation
  mockOptions: {
    seed: 42,           // Deterministic generation
    stringLength: 15,   // Default string length
    arrayLength: 3      // Default array length
  },

  // Validate responses against schemas (default: true)
  validateResponses: true,

  // Simulate network latency (in milliseconds)
  delay: 100
});
```

## Mock Handlers

Create mock handlers for server-side testing:

```typescript
import { createMockHandler } from '@adi-family/http-mocks';

// With fixed response
const mockHandler = createMockHandler(
  getUserConfig,
  { id: '123', name: 'Test User' }
);

// With dynamic response
const dynamicHandler = createMockHandler(
  getUserConfig,
  (ctx) => ({
    id: ctx.params.id,
    name: `User ${ctx.params.id}`
  })
);

// Use the handler
const result = await mockHandler.fn({
  params: { id: '123' },
  query: {},
  body: undefined,
  headers: new Headers(),
  raw: {}
});
```

## Mock Context

Create mock contexts for testing handler functions:

```typescript
import { createMockContext } from '@adi-family/http-mocks';

// Auto-generated context
const ctx = createMockContext(createUserConfig);

// Custom context
const customCtx = createMockContext(createUserConfig, {
  body: { name: 'John', email: 'john@example.com' },
  params: { orgId: '456' },
  headers: new Headers({ 'Authorization': 'Bearer token' })
});

// Test your handler
const result = await myHandler.fn(customCtx);
```

## Mock Handler Factory

Create multiple variations of mock handlers from the same config:

```typescript
import { createMockHandlerFactory } from '@adi-family/http-mocks';

const factory = createMockHandlerFactory(getUserConfig);

// Fixed response
const handler1 = factory.withResponse({
  id: '1',
  name: 'Fixed User'
});

// Dynamic response
const handler2 = factory.withResponseFn((ctx) => ({
  id: ctx.params.id,
  name: `User ${ctx.params.id}`
}));

// Auto-generated response
const handler3 = factory.withGeneratedResponse();

// Create contexts
const ctx = factory.createContext({
  params: { id: '123' }
});
```

## Direct Mock Generation

Generate mock data directly from any Zod schema:

```typescript
import { z } from 'zod';
import { generateMock } from '@adi-family/http-mocks';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(18).max(100),
  role: z.enum(['admin', 'user', 'guest']),
  tags: z.array(z.string())
});

const mockUser = generateMock(userSchema);
```

### Supported Zod Types

The mock generator supports all common Zod types:

- **Primitives**: `string`, `number`, `boolean`, `date`, `bigint`
- **Special Strings**: `email`, `url`, `uuid`, `cuid`
- **Enums**: `enum`, `nativeEnum`
- **Objects**: `object`, `record`
- **Arrays**: `array`, `tuple`, `set`
- **Optionals**: `optional`, `nullable`, `default`
- **Unions**: `union`, `discriminatedUnion`
- **Advanced**: `intersection`, `lazy`, `effects`, `transform`

### Generation Options

```typescript
generateMock(schema, {
  // Seed for deterministic generation
  seed: 42,

  // Default string length
  stringLength: 10,

  // Default array length
  arrayLength: 3,

  // Custom generators for specific types
  customGenerators: {
    ZodString: () => 'custom-string'
  }
});
```

## Testing Patterns

### Unit Testing with Mocks

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockClient } from '@adi-family/http-mocks';
import { UserService } from './user-service';

describe('UserService', () => {
  let mockClient: MockClient;
  let userService: UserService;

  beforeEach(() => {
    mockClient = new MockClient();
    userService = new UserService(mockClient);
  });

  it('should fetch user by id', async () => {
    mockClient.register(getUserConfig, {
      id: '1',
      name: 'Test User',
      email: 'test@example.com'
    });

    const user = await userService.getUser('1');

    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
  });
});
```

### Spy on Mock Calls

Track all calls made to the mock client:

```typescript
const mockClient = new MockClient();
const spy = mockClient.createSpy();

await mockClient.run(getUserConfig, { params: { id: '1' } });
await mockClient.run(getUserConfig, { params: { id: '2' } });

console.log(spy.getCallCount()); // 2
console.log(spy.getLastCall()); // Last call details
console.log(spy.getCalls()); // All calls

// Reset the spy
spy.reset();
```

### Testing Error Conditions

```typescript
// Simulate validation errors
mockClient.register(createUserConfig, () => {
  throw new Error('Validation failed');
});

// Simulate network delays
const slowClient = new MockClient({ delay: 1000 });

// Test with invalid data (will fail validation)
await expect(
  mockClient.run(createUserConfig, {
    body: { name: '', email: 'invalid' }
  })
).rejects.toThrow();
```

### Integration with Existing Tests

Replace your real client with a mock client in tests:

```typescript
// Production code
export class ApiClient {
  constructor(private client: BaseClient | MockClient) {}

  async getUser(id: string) {
    return this.client.run(getUserConfig, { params: { id } });
  }
}

// Test code
const mockClient = new MockClient();
const apiClient = new ApiClient(mockClient);

mockClient.register(getUserConfig, { id: '1', name: 'Test' });
const user = await apiClient.getUser('1');
```

## Best Practices

### 1. Use Type-Safe Mocks

Let TypeScript ensure your mock data matches your schemas:

```typescript
// ✅ Type-safe
mockClient.register(getUserConfig, {
  id: '1',
  name: 'John',
  email: 'john@example.com'
});

// ❌ Type error - missing required fields
mockClient.register(getUserConfig, {
  id: '1'
});
```

### 2. Deterministic Tests

Use seeds for reproducible test results:

```typescript
const mockClient = new MockClient({
  mockOptions: { seed: 42 }
});

// Same seed = same generated data every time
```

### 3. Test Edge Cases

Use mocks to easily test edge cases:

```typescript
// Empty arrays
mockClient.register(getProjectsConfig, { projects: [] });

// Large datasets
mockClient.register(getProjectsConfig, {
  projects: Array.from({ length: 1000 }, (_, i) => ({
    id: `${i}`,
    name: `Project ${i}`
  }))
});

// Optional fields
mockClient.register(getUserConfig, {
  id: '1',
  name: 'John',
  email: 'john@example.com',
  bio: undefined // Test optional field
});
```

### 4. Organize Mock Data

Create reusable mock data factories:

```typescript
// test/fixtures/users.ts
export const createMockUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

// In tests
mockClient.register(getUserConfig, createMockUser({ id: '123' }));
```

### 5. Clean Up Between Tests

```typescript
describe('UserService', () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = new MockClient();
  });

  afterEach(() => {
    mockClient.clear(); // Clear all registered handlers
  });

  // Tests...
});
```

## Examples

See the [examples/mocks](https://github.com/adi-family/http/tree/main/examples/mocks) directory for complete working examples of all mock generation features.

## API Reference

For detailed API documentation, see the [@adi-family/http-mocks README](https://github.com/adi-family/http/tree/main/packages/http-mocks).

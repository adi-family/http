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

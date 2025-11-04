# @adi-family/http-mocks

Mock generation utilities for [@adi-family/http](https://github.com/adi-family/http). Perfect for testing and development without making real HTTP requests.

## Features

- **🎲 Automatic Mock Generation**: Generate mock data from Zod schemas
- **🧪 Mock Handlers**: Create mock handlers from handler configs
- **🔌 Mock Client**: Drop-in replacement for BaseClient that returns mock data
- **🎯 Type-Safe**: Full TypeScript support with type inference
- **⚡ Zero Network Calls**: Perfect for unit testing
- **🎛️ Flexible**: Use generated data or provide custom responses

## Installation

```bash
npm install @adi-family/http-mocks
# or
bun add @adi-family/http-mocks
```

## Quick Start

### Mock Client

The easiest way to use mocks is with `MockClient`:

```typescript
import { MockClient } from '@adi-family/http-mocks';
import { getProjectConfig } from './configs';

// Create a mock client
const mockClient = new MockClient();

// Register mock responses
mockClient.register(getProjectConfig, {
  id: '123',
  name: 'Mock Project',
  status: 'active'
});

// Use it like a normal client
const project = await mockClient.run(getProjectConfig, {
  params: { id: '123' }
});

console.log(project.name); // "Mock Project"
```

### Auto-Generated Mocks

If you don't provide mock data, it will be automatically generated from your Zod schemas:

```typescript
import { z } from 'zod';
import { MockClient } from '@adi-family/http-mocks';

const userConfig = {
  method: 'GET' as const,
  route: { type: 'static' as const, path: '/user' },
  response: {
    schema: z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      age: z.number().int().min(0).max(120)
    })
  }
};

const mockClient = new MockClient();

// No registration needed - data is auto-generated!
const user = await mockClient.run(userConfig);

console.log(user);
// {
//   id: "aBcD123456",
//   email: "user1234@example.com",
//   name: "xYzAbC7890",
//   age: 42
// }
```

### Mock Handlers

Create mock handlers for server-side testing:

```typescript
import { createMockHandler } from '@adi-family/http-mocks';
import { getProjectConfig } from './configs';

// Create a mock handler that returns specific data
const mockHandler = createMockHandler(
  getProjectConfig,
  { id: '123', name: 'Test Project' }
);

// Or use a function for dynamic responses
const dynamicMockHandler = createMockHandler(
  getProjectConfig,
  (ctx) => ({
    id: ctx.params.id,
    name: `Project ${ctx.params.id}`
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

console.log(result.name); // "Test Project"
```

### Mock Context

Create mock contexts for testing handler functions:

```typescript
import { createMockContext } from '@adi-family/http-mocks';
import { createProjectConfig } from './configs';

// Create a mock context with generated data
const ctx = createMockContext(createProjectConfig);

// Or provide custom data
const customCtx = createMockContext(createProjectConfig, {
  body: { name: 'Custom Project' },
  params: { orgId: '456' }
});

// Test your handler function
const result = await myHandlerFunction(customCtx);
```

### Generate Mock Data Directly

Generate mock data from any Zod schema:

```typescript
import { z } from 'zod';
import { generateMock } from '@adi-family/http-mocks';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  age: z.number().int().min(18).max(100),
  role: z.enum(['admin', 'user', 'guest']),
  tags: z.array(z.string())
});

const mockUser = generateMock(userSchema);

console.log(mockUser);
// {
//   id: "550e8400-e29b-41d4-a716-446655440000",
//   email: "user4321@example.com",
//   name: "aBcD123456",
//   age: 42,
//   role: "user",
//   tags: ["xYz", "AbC", "123"]
// }
```

## API Reference

### `MockClient`

A mock HTTP client that returns mock data without making real HTTP requests.

```typescript
const mockClient = new MockClient({
  mockOptions?: MockGeneratorOptions,
  validateResponses?: boolean, // default: true
  delay?: number, // simulate network latency in ms
});
```

**Methods:**

- `register(config, response)` - Register a mock response for a config
- `registerHandler(handler)` - Register a complete handler
- `run(config, options)` - Execute a request (returns mock data)
- `clear()` - Clear all registered handlers
- `createSpy()` - Create a spy to track all calls

### `createMockHandler`

Create a mock handler from a handler config.

```typescript
createMockHandler(config, responseOverride?, options?)
```

### `createMockContext`

Create a mock context for testing handler functions.

```typescript
createMockContext(config, overrides?, options?)
```

### `createMockHandlerFactory`

Create a factory for easily creating different mock handlers from the same config.

```typescript
const factory = createMockHandlerFactory(config);

factory.withResponse(data); // Fixed response
factory.withResponseFn(fn); // Dynamic response
factory.withGeneratedResponse(); // Auto-generated response
factory.createContext(overrides?); // Create mock context
```

### `generateMock`

Generate mock data from a Zod schema.

```typescript
generateMock(schema, options?)
```

**Options:**

```typescript
interface MockGeneratorOptions {
  seed?: number; // For deterministic generation
  stringLength?: number; // Default: 10
  arrayLength?: number; // Default: 3
  customGenerators?: Record<string, () => any>;
}
```

## Advanced Usage

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
```

### Simulate Network Latency

```typescript
const mockClient = new MockClient({
  delay: 100 // 100ms delay for all requests
});
```

### Deterministic Mock Generation

Use a seed for consistent mock data:

```typescript
const mockClient = new MockClient({
  mockOptions: {
    seed: 12345 // Same seed = same generated data
  }
});
```

### Dynamic Mock Responses

Use functions to create dynamic responses based on request data:

```typescript
mockClient.register(getProjectConfig, ({ params }) => ({
  id: params.id,
  name: `Project ${params.id}`,
  createdAt: new Date()
}));
```

## Integration with Testing Frameworks

### With Vitest/Jest

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockClient } from '@adi-family/http-mocks';

describe('UserService', () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = new MockClient();
  });

  it('should fetch user data', async () => {
    mockClient.register(getUserConfig, {
      id: '1',
      name: 'Test User'
    });

    const user = await mockClient.run(getUserConfig, {
      params: { id: '1' }
    });

    expect(user.name).toBe('Test User');
  });
});
```

## License

MIT

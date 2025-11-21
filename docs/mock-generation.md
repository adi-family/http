# Mock Generation

Generate realistic test data and mock handlers automatically from your API contracts.

## Overview

The `@adi-family/http` mock generation utilities provide a complete testing toolkit that leverages your existing Zod schemas to generate type-safe, realistic test data. No need to maintain separate mock data - everything is generated automatically from your API contracts.

## Why Mock Generation?

When testing HTTP APIs, you typically need:

1. **Realistic test data** that matches your schemas
2. **Mock handlers** to test clients without a server
3. **Request/response scenarios** for integration tests
4. **Spy capabilities** for behavioral assertions

The mock utilities solve all of these problems while maintaining **full type safety** and **single source of truth** with your production code.

## Installation

Mock utilities are included in the core package:

```bash
npm install @adi-family/http zod
```

Import from the `/mock` subpath:

```typescript
import { generateMockData, createMockHandler } from '@adi-family/http/mock';
```

## Quick Example

```typescript
import { z } from 'zod';
import { generateMockData, createMockHandler } from '@adi-family/http/mock';

// Your API config (same as production)
const getUserConfig = {
  method: 'GET',
  route: {
    type: 'pattern',
    pattern: '/users/:id',
    params: z.object({ id: z.string().uuid() }),
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      createdAt: z.date(),
    }),
  },
};

// Generate mock data
const mockUser = generateMockData(getUserConfig.response.schema);
console.log(mockUser);
// {
//   id: "550e8400-e29b-41d4-a716-446655440000",
//   name: "aB3Cd5Ef",
//   email: "xY7zK@abc123.com",
//   createdAt: Date(...)
// }

// Create mock handler
const mockHandler = createMockHandler(getUserConfig, {
  data: mockUser,
});

// Use in tests
const ctx = createMockContext(getUserConfig, {
  params: { id: mockUser.id },
});

const result = await mockHandler.fn(ctx);
expect(result).toEqual(mockUser);
```

## Core Features

### 1. Schema-Based Mock Data

Generate realistic data from any Zod schema:

```typescript
import { generateMockData } from '@adi-family/http/mock';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.enum(['admin', 'user', 'guest']),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
});

const mockUser = generateMockData(userSchema);
// All fields are automatically generated with realistic values
// that respect the schema constraints
```

The generator understands:
- String formats (email, url, uuid, etc.)
- Numeric constraints (min, max, int)
- Array constraints (min/max length)
- Enums and unions
- Optional and nullable fields
- Nested objects and arrays

### 2. Deterministic Generation

Use seeds for reproducible tests:

```typescript
const user1 = generateMockData(userSchema, { seed: 12345 });
const user2 = generateMockData(userSchema, { seed: 12345 });

expect(user1).toEqual(user2); // ✅ Always the same
```

Perfect for:
- Snapshot testing
- CI/CD reproducibility
- Debugging failing tests

### 3. Custom Overrides

Override specific fields while auto-generating the rest:

```typescript
const mockUser = generateMockData(userSchema, {
  overrides: {
    name: 'John Doe',
    email: 'john@example.com',
  },
});

console.log(mockUser.name); // "John Doe" (overridden)
console.log(mockUser.id);   // Generated UUID
console.log(mockUser.age);  // Generated number
```

### 4. Mock Handlers

Create handlers that return mock data:

```typescript
import { createMockHandler } from '@adi-family/http/mock';

// Static data
const staticHandler = createMockHandler(getUserConfig, {
  data: { id: '123', name: 'Test User', email: 'test@example.com', createdAt: new Date() },
});

// Auto-generated from response schema
const autoHandler = createMockHandler(getUserConfig);

// Custom logic
const customHandler = createMockHandler(getUserConfig, {
  respond: async (ctx) => ({
    id: ctx.params.id,
    name: `User ${ctx.params.id}`,
    email: `user-${ctx.params.id}@example.com`,
    createdAt: new Date(),
  }),
});

// With delays and errors
const flakyHandler = createMockHandler(getUserConfig, {
  data: mockUser,
  delay: 100,              // 100ms delay
  errorProbability: 0.1,   // 10% chance of error
});
```

### 5. Spy Handlers

Track calls for testing assertions:

```typescript
import { createSpyHandler } from '@adi-family/http/mock';

const spy = createSpyHandler(createUserConfig, {
  respond: async (ctx) => ({
    id: presets.id(),
    ...ctx.body,
    createdAt: new Date(),
  }),
});

// Make calls
await spy.fn(mockContext1);
await spy.fn(mockContext2);

// Assert
expect(spy.callCount()).toBe(2);
expect(spy.wasCalledWith({ body: { name: 'John' } })).toBe(true);
expect(spy.lastCall()?.body).toEqual({ name: 'Jane', email: 'jane@example.com' });

// Reset for next test
spy.reset();
```

### 6. Complete Scenarios

Generate full request/response pairs:

```typescript
import {
  generateMockRequest,
  generateMockResponse,
  generateMockScenario,
} from '@adi-family/http/mock';

// Just the request
const request = generateMockRequest(createUserConfig);
// { body: { name: "...", email: "..." } }

// Just the response
const response = generateMockResponse(getUserConfig);
// { id: "...", name: "...", email: "...", createdAt: ... }

// Both together
const scenario = generateMockScenario(createUserConfig);
// {
//   request: { body: {...} },
//   response: { id: "...", ... }
// }

// Many scenarios
const scenarios = generateMockScenarios(createUserConfig, 100);
```

### 7. Presets

Quick access to common patterns:

```typescript
import { presets } from '@adi-family/http/mock';

presets.id();          // UUID
presets.email();       // Email address
presets.url();         // URL
presets.timestamp();   // ISO timestamp
presets.pagination();  // Pagination object
presets.error();       // Error response

// All support seeding
const id = presets.id(12345);
```

## Testing Patterns

### Unit Testing

```typescript
describe('User Handler', () => {
  it('should create user', async () => {
    const ctx = createMockContext(createUserConfig, {
      body: { name: 'John', email: 'john@example.com' },
    });

    const result = await createUserHandler.fn(ctx);

    expect(result.name).toBe('John');
    expect(result.id).toBeDefined();
  });
});
```

### Integration Testing

```typescript
describe('User Service', () => {
  it('should fetch user', async () => {
    const mockHandler = createMockHandler(getUserConfig, {
      data: { id: '123', name: 'John', email: 'john@example.com', createdAt: new Date() },
    });

    // Wire up mock handler to your client
    const service = new UserService(mockClient);
    const user = await service.getUser('123');

    expect(user.name).toBe('John');
  });
});
```

### Property-Based Testing

```typescript
describe('Handler Properties', () => {
  it('should handle any valid input', () => {
    const scenarios = generateMockScenarios(createUserConfig, 100);

    for (const scenario of scenarios) {
      const ctx = createMockContext(createUserConfig, {
        body: scenario.request.body,
      });

      const result = await handler.fn(ctx);

      // Verify invariants
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      assertValidMockData(userSchema, result);
    }
  });
});
```

### Snapshot Testing

```typescript
describe('Response Format', () => {
  it('should match snapshot', () => {
    const mockData = generateMockData(userSchema, { seed: 12345 });

    // Deterministic seed ensures consistent snapshots
    expect(mockData).toMatchSnapshot();
  });
});
```

## API Reference

See the complete [Mock API Reference](/http/api/mock) for detailed documentation.

### Main Functions

- **`generateMockData(schema, options?)`** - Generate mock data from schema
- **`generateMockDataArray(schema, count, options?)`** - Generate array of mock data
- **`createMockHandler(config, options?)`** - Create mock handler
- **`createSpyHandler(config, options?)`** - Create spy handler
- **`generateMockRequest(config, options?)`** - Generate request data
- **`generateMockResponse(config, options?)`** - Generate response data
- **`generateMockScenario(config, options?)`** - Generate request + response
- **`createMockContext(config, overrides?)`** - Create mock handler context
- **`validateMockData(schema, data)`** - Validate mock data
- **`presets`** - Common mock data patterns

## Best Practices

### ✅ Do

- **Use seeds in CI/CD** for reproducible tests
- **Generate many test cases** with property-based testing
- **Leverage auto-generation** instead of manual mocks
- **Test with realistic data** that matches your schemas
- **Use spy handlers** to verify behavior
- **Reset spies** between tests

### ❌ Don't

- **Don't manually create mock data** - let the generator do it
- **Don't use random data** in snapshots - use seeds
- **Don't forget to validate** generated data in tests
- **Don't reuse spies** across tests without resetting

## Examples

For complete working examples, see:
- [Mock Example](/http/examples/mock-example) - Comprehensive mock generation examples
- [Testing Guide](/http/guides/testing) - Testing patterns and best practices

## Learn More

- [API Reference](/http/api/mock) - Complete API documentation
- [Testing Guide](/http/guides/testing) - Testing patterns
- [Examples](/http/examples) - Working code examples

## Next Steps

- Learn about [Testing Patterns](/http/guides/testing)
- Explore [API Reference](/http/api/mock)
- See [Examples](/http/examples/mock-example)

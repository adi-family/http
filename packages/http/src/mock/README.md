# Mock Generation Utilities

Comprehensive mock generation tools for testing HTTP handlers and clients with **@adi-family/http**.

## Overview

The mock generation utilities allow you to:
- ✅ Generate realistic test data from Zod schemas
- ✅ Create mock handlers for testing clients without a server
- ✅ Spy on handler calls for testing assertions
- ✅ Generate complete request/response scenarios
- ✅ Ensure type safety in all your tests

## Installation

The mock utilities are included in the `@adi-family/http` package:

```bash
npm install @adi-family/http zod
```

## Quick Start

```typescript
import { z } from 'zod';
import { generateMockData, createMockHandler } from '@adi-family/http/mock';

// Define a schema
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

// Generate mock data
const mockUser = generateMockData(userSchema);
// => { id: "550e8400-e29b-41d4-a716-446655440000", name: "aB3Cd5Ef", email: "xY7zK@abc123.com" }

// Create a mock handler
const mockHandler = createMockHandler(getUserConfig, {
  data: mockUser,
});
```

## Core Features

### 1. Mock Data Generation

Generate realistic mock data from any Zod schema:

```typescript
import { generateMockData, generateMockDataArray } from '@adi-family/http/mock';

// Simple types
const name = generateMockData(z.string()); // => "aB3Cd5Ef"
const age = generateMockData(z.number()); // => 42
const active = generateMockData(z.boolean()); // => true

// Complex objects
const user = generateMockData(z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18),
}));

// Arrays
const users = generateMockDataArray(userSchema, 10);

// With options
const deterministicUser = generateMockData(userSchema, {
  seed: 12345, // Deterministic generation
  overrides: { name: 'John Doe' }, // Override specific fields
  arrayLength: 5, // Default array length
});
```

#### Supported Zod Types

The mock generator supports all common Zod types:

- ✅ Primitives: `string`, `number`, `boolean`, `date`, `bigint`
- ✅ String formats: `email`, `url`, `uuid`, `cuid`, `cuid2`
- ✅ String constraints: `min`, `max`, `length`
- ✅ Number constraints: `min`, `max`, `int`
- ✅ Objects with nested properties
- ✅ Arrays with min/max length
- ✅ Enums and native enums
- ✅ Unions and discriminated unions
- ✅ Optional and nullable fields
- ✅ Records and tuples
- ✅ Intersections
- ✅ Literals

### 2. Mock Handlers

Create mock handlers that return predefined or generated data:

```typescript
import { createMockHandler } from '@adi-family/http/mock';

// With static data
const staticHandler = createMockHandler(getProjectConfig, {
  data: { id: '123', name: 'Test Project' },
});

// With auto-generated data (from response schema)
const autoHandler = createMockHandler(getProjectConfig);

// With custom logic
const customHandler = createMockHandler(getProjectConfig, {
  respond: async (ctx) => ({
    id: ctx.params.id,
    name: `Project ${ctx.params.id}`,
  }),
});

// With network delay
const slowHandler = createMockHandler(getProjectConfig, {
  data: mockProject,
  delay: 100, // 100ms delay
});

// With error simulation
const errorHandler = createMockHandler(getProjectConfig, {
  error: new Error('Not found'),
});

// With random errors
const flakyHandler = createMockHandler(getProjectConfig, {
  data: mockProject,
  errorProbability: 0.1, // 10% chance of error
});
```

### 3. Spy Handlers

Record and assert on handler calls:

```typescript
import { createSpyHandler } from '@adi-family/http/mock';

const spyHandler = createSpyHandler(createProjectConfig, {
  data: { id: '123', name: 'Test' },
});

// Use the handler
await spyHandler.fn(mockContext);

// Assert on calls
expect(spyHandler.callCount()).toBe(1);
expect(spyHandler.wasCalledWith({
  body: { name: 'Test Project' }
})).toBe(true);
expect(spyHandler.lastCall()?.body).toEqual({ name: 'Test Project' });

// Reset for next test
spyHandler.reset();
```

### 4. Request/Response Generation

Generate complete test scenarios:

```typescript
import {
  generateMockRequest,
  generateMockResponse,
  generateMockScenario,
  generateMockScenarios,
} from '@adi-family/http/mock';

// Generate request data (params, query, body)
const request = generateMockRequest(createProjectConfig);
// => { body: { name: "...", description: "..." } }

// Generate response data
const response = generateMockResponse(getProjectConfig);
// => { id: "...", name: "...", createdAt: "..." }

// Generate complete scenario
const scenario = generateMockScenario(createProjectConfig);
// => {
//   request: { body: {...} },
//   response: { id: "...", name: "..." }
// }

// Generate multiple scenarios
const scenarios = generateMockScenarios(createProjectConfig, 10);
```

### 5. Mock Context

Create mock contexts for testing handler functions directly:

```typescript
import { createMockContext } from '@adi-family/http/mock';

const ctx = createMockContext(createProjectConfig, {
  body: { name: 'Custom Project' },
  headers: { authorization: 'Bearer token123' },
});

// Test your handler function directly
const result = await myHandler.fn(ctx);
```

### 6. Presets

Use presets for common mock patterns:

```typescript
import { presets } from '@adi-family/http/mock';

presets.id();          // => "550e8400-e29b-41d4-a716-446655440000"
presets.email();       // => "abc123@xyz456.com"
presets.url();         // => "https://abc123.com/xyz456"
presets.date();        // => Date object
presets.timestamp();   // => "2024-01-01T00:00:00.000Z"
presets.pagination();  // => { page: 1, limit: 20, total: 100, totalPages: 5 }
presets.error();       // => { error: "...", message: "...", statusCode: 404 }

// All presets support seeded generation
const deterministicId = presets.id(12345);
```

### 7. Validation Utilities

Verify that generated mock data is valid:

```typescript
import { validateMockData, assertValidMockData } from '@adi-family/http/mock';

const mockData = generateMockData(userSchema);

// Check validity
if (validateMockData(userSchema, mockData)) {
  console.log('Valid!');
}

// Assert validity (throws if invalid)
assertValidMockData(userSchema, mockData);
```

## Testing Patterns

### Unit Testing Handlers

```typescript
import { createMockContext } from '@adi-family/http/mock';

describe('createProject handler', () => {
  it('should create a project', async () => {
    const ctx = createMockContext(createProjectConfig, {
      body: { name: 'Test Project' },
    });

    const result = await createProjectHandler.fn(ctx);

    expect(result.name).toBe('Test Project');
    expect(result.status).toBe('draft');
  });
});
```

### Integration Testing Clients

```typescript
import { createMockHandler } from '@adi-family/http/mock';

describe('ProjectService', () => {
  it('should fetch project', async () => {
    const mockHandler = createMockHandler(getProjectConfig, {
      data: { id: '123', name: 'Test Project' },
    });

    // Mock your HTTP client to use the mock handler
    const service = new ProjectService(mockClient);
    const project = await service.getProject('123');

    expect(project.name).toBe('Test Project');
  });
});
```

### Spy Testing

```typescript
import { createSpyHandler } from '@adi-family/http/mock';

describe('createProject with spy', () => {
  it('should call handler with correct data', async () => {
    const spy = createSpyHandler(createProjectConfig);

    await service.createProject({ name: 'Test' });

    expect(spy.callCount()).toBe(1);
    expect(spy.wasCalledWith({ body: { name: 'Test' } })).toBe(true);
  });
});
```

### Property-Based Testing

```typescript
import { generateMockScenarios } from '@adi-family/http/mock';

describe('handler properties', () => {
  it('should handle any valid input', async () => {
    const scenarios = generateMockScenarios(createProjectConfig, 100);

    for (const scenario of scenarios) {
      const ctx = createMockContext(createProjectConfig, {
        body: scenario.request.body,
      });

      const result = await handler.fn(ctx);

      // Verify invariants
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    }
  });
});
```

### Snapshot Testing

```typescript
import { generateMockData } from '@adi-family/http/mock';

describe('response format', () => {
  it('should match snapshot', () => {
    const mockData = generateMockData(projectSchema, { seed: 12345 });

    // Use deterministic seed for consistent snapshots
    expect(mockData).toMatchSnapshot();
  });
});
```

## Advanced Usage

### Custom Seeding for Reproducible Tests

```typescript
const seed = 12345;

// All of these will generate the same data when using the same seed
const user1 = generateMockData(userSchema, { seed });
const user2 = generateMockData(userSchema, { seed });

expect(user1).toEqual(user2);
```

### Overriding Specific Fields

```typescript
const mockUser = generateMockData(userSchema, {
  overrides: {
    'name': 'John Doe',
    'profile.bio': 'Custom bio',
  },
});
```

### Controlling Array Lengths

```typescript
const projects = generateMockData(z.array(projectSchema), {
  arrayLength: 10, // Default length for arrays without constraints
});
```

### Preventing Infinite Recursion

```typescript
const recursiveSchema: any = z.lazy(() =>
  z.object({
    value: z.string(),
    children: z.array(recursiveSchema).optional(),
  })
);

const mockData = generateMockData(recursiveSchema, {
  maxDepth: 3, // Limit nesting depth
});
```

## API Reference

### Mock Data Generation

#### `generateMockData<T>(schema: ZodSchema<T>, options?: MockGeneratorOptions): T`

Generate mock data from a Zod schema.

**Options:**
- `seed?: number` - Seed for deterministic generation
- `overrides?: Record<string, any>` - Override specific field values
- `maxDepth?: number` - Maximum nesting depth (default: 10)
- `arrayLength?: number` - Default array length (default: 3)

#### `generateMockDataArray<T>(schema: ZodSchema<T>, count: number, options?: MockGeneratorOptions): T[]`

Generate multiple mock data items.

### Mock Handlers

#### `createMockHandler<T>(config: HandlerConfig<T>, options?: MockHandlerOptions): Handler<T>`

Create a mock handler.

**Options:**
- `data?: T` - Static response data
- `respond?: (ctx) => T | Promise<T>` - Custom response function
- `delay?: number` - Simulated delay in ms
- `error?: Error | (ctx) => Error` - Error to throw
- `errorProbability?: number` - Random error probability (0-1)
- `seed?: number` - Seed for auto-generation
- `statusCode?: number` - HTTP status code

#### `createSpyHandler<T>(config: HandlerConfig<T>, options?: MockHandlerOptions): SpiedMockHandler<T>`

Create a spy handler that records calls.

**Methods:**
- `callCount(): number` - Get number of calls
- `wasCalledWith(matcher): boolean` - Check if called with specific data
- `lastCall(): RecordedRequest | undefined` - Get last call
- `reset(): void` - Reset recorded calls

### Utilities

#### `generateMockRequest(config: HandlerConfig, options?: MockGeneratorOptions)`

Generate mock request data (params, query, body).

#### `generateMockResponse(config: HandlerConfig, options?: MockGeneratorOptions)`

Generate mock response data.

#### `generateMockScenario(config: HandlerConfig, options?: MockGeneratorOptions)`

Generate complete scenario (request + response).

#### `generateMockScenarios(config: HandlerConfig, count: number, options?: MockGeneratorOptions)`

Generate multiple scenarios.

#### `createMockContext(config: HandlerConfig, overrides?)`

Create a mock context for testing handlers directly.

#### `validateMockData(schema: ZodSchema, data: unknown): boolean`

Check if data is valid according to schema.

#### `assertValidMockData(schema: ZodSchema, data: unknown): asserts data is T`

Assert data is valid (throws if not).

## Best Practices

1. **Use seeds for deterministic tests**: Always use `seed` option in CI/CD for reproducible tests

2. **Prefer overrides over manual mocks**: Let the generator handle the structure

3. **Test with property-based approaches**: Generate many test cases to catch edge cases

4. **Keep mocks close to real data**: The generator creates realistic data, use it

5. **Use spy handlers for behavior testing**: Track calls and assertions

6. **Validate generated data**: Use `assertValidMockData` to ensure mock quality

7. **Reset spies between tests**: Always call `spy.reset()` in test cleanup

## Examples

See [mock-example.ts](../../../../examples/mock-example.ts) for comprehensive examples.

## License

MIT

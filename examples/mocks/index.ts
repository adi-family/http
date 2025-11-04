/**
 * Examples demonstrating @adi-family/http-mocks
 */

import { z } from 'zod';
import { route } from '@adi-family/http';
import {
  MockClient,
  generateMock,
  createMockHandler,
  createMockContext,
  createMockHandlerFactory,
} from '@adi-family/http-mocks';
import type { HandlerConfig } from '@adi-family/http';

// ============================================================================
// Example 1: Basic Mock Client Usage
// ============================================================================

console.log('Example 1: Basic Mock Client Usage');
console.log('====================================\n');

const getUserConfig: HandlerConfig<{ id: string }, never, never, { id: string; name: string; email: string }> = {
  method: 'GET',
  route: route.pattern('/users/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
    }),
  },
};

const mockClient = new MockClient();

// Register a specific mock response
mockClient.register(getUserConfig, {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
});

// Use the mock client
const user = await mockClient.run(getUserConfig, {
  params: { id: '123' },
});

console.log('Registered mock user:', user);

// ============================================================================
// Example 2: Auto-Generated Mocks
// ============================================================================

console.log('\nExample 2: Auto-Generated Mocks');
console.log('================================\n');

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['active', 'pending', 'completed']),
  createdAt: z.date(),
  tags: z.array(z.string()),
  metadata: z.record(z.string()),
});

const getProjectConfig: HandlerConfig<{ id: string }, never, never, z.infer<typeof projectSchema>> = {
  method: 'GET',
  route: route.pattern('/projects/:id', z.object({ id: z.string() })),
  response: { schema: projectSchema },
};

const autoMockClient = new MockClient({
  mockOptions: {
    seed: 42, // Deterministic generation
    stringLength: 15,
    arrayLength: 3,
  },
});

// No registration needed - data is auto-generated!
const project = await autoMockClient.run(getProjectConfig, {
  params: { id: '456' },
});

console.log('Auto-generated project:', JSON.stringify(project, null, 2));

// ============================================================================
// Example 3: Dynamic Mock Responses
// ============================================================================

console.log('\nExample 3: Dynamic Mock Responses');
console.log('==================================\n');

const searchConfig: HandlerConfig<
  never,
  { query: string; limit?: number },
  never,
  { results: Array<{ id: string; title: string }> }
> = {
  method: 'GET',
  route: route.static('/search'),
  query: {
    schema: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
  },
  response: {
    schema: z.object({
      results: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
        })
      ),
    }),
  },
};

mockClient.register(searchConfig, ({ query }) => {
  const limit = query?.limit ?? 10;
  return {
    results: Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `result-${i}`,
      title: `Search result for "${query?.query}" #${i + 1}`,
    })),
  };
});

const searchResults = await mockClient.run(searchConfig, {
  query: { query: 'typescript', limit: 3 },
});

console.log('Search results:', JSON.stringify(searchResults, null, 2));

// ============================================================================
// Example 4: Mock Handlers for Server Testing
// ============================================================================

console.log('\nExample 4: Mock Handlers for Server Testing');
console.log('============================================\n');

const createUserConfig: HandlerConfig<
  never,
  never,
  { name: string; email: string },
  { id: string; name: string; email: string; createdAt: Date }
> = {
  method: 'POST',
  route: route.static('/users'),
  body: {
    schema: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      createdAt: z.date(),
    }),
  },
};

// Create a mock handler
const mockCreateUserHandler = createMockHandler(
  createUserConfig,
  (ctx) => ({
    id: `user-${Date.now()}`,
    name: ctx.body.name,
    email: ctx.body.email,
    createdAt: new Date(),
  })
);

// Test the handler
const newUser = await mockCreateUserHandler.fn({
  params: {},
  query: {},
  body: { name: 'Jane Smith', email: 'jane@example.com' },
  headers: new Headers(),
  raw: {},
});

console.log('Created user via mock handler:', newUser);

// ============================================================================
// Example 5: Mock Handler Factory
// ============================================================================

console.log('\nExample 5: Mock Handler Factory');
console.log('================================\n');

const factory = createMockHandlerFactory(getUserConfig);

// Create different types of handlers
const handlerWithFixedResponse = factory.withResponse({
  id: '999',
  name: 'Fixed User',
  email: 'fixed@example.com',
});

const handlerWithDynamicResponse = factory.withResponseFn((ctx) => ({
  id: ctx.params.id,
  name: `User ${ctx.params.id}`,
  email: `user${ctx.params.id}@example.com`,
}));

const handlerWithGeneratedResponse = factory.withGeneratedResponse();

// Test them
const fixedResult = await handlerWithFixedResponse.fn(
  factory.createContext({ params: { id: '1' } })
);
console.log('Fixed response:', fixedResult);

const dynamicResult = await handlerWithDynamicResponse.fn(
  factory.createContext({ params: { id: '42' } })
);
console.log('Dynamic response:', dynamicResult);

const generatedResult = await handlerWithGeneratedResponse.fn(
  factory.createContext({ params: { id: '100' } })
);
console.log('Generated response:', generatedResult);

// ============================================================================
// Example 6: Direct Mock Generation
// ============================================================================

console.log('\nExample 6: Direct Mock Generation');
console.log('==================================\n');

const complexSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    username: z.string(),
    email: z.string().email(),
    profile: z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number().int().min(18).max(100),
      bio: z.string().optional(),
    }),
  }),
  settings: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    notifications: z.boolean(),
    language: z.string(),
  }),
  permissions: z.array(z.string()),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

const mockData = generateMock(complexSchema, {
  seed: 123,
  stringLength: 12,
  arrayLength: 4,
});

console.log('Generated complex mock data:', JSON.stringify(mockData, null, 2));

// ============================================================================
// Example 7: Mock Client Spy
// ============================================================================

console.log('\nExample 7: Mock Client Spy');
console.log('===========================\n');

const spyClient = new MockClient();
const spy = spyClient.createSpy();

spyClient.register(getUserConfig, {
  id: '1',
  name: 'Spy User',
  email: 'spy@example.com',
});

// Make some calls
await spyClient.run(getUserConfig, { params: { id: '1' } });
await spyClient.run(getUserConfig, { params: { id: '2' } });
await spyClient.run(getUserConfig, { params: { id: '3' } });

console.log('Number of calls:', spy.getCallCount());
console.log('Last call params:', spy.getLastCall()?.options.params);
console.log(
  'All call params:',
  spy.getCalls().map((call) => call.options.params)
);

// ============================================================================
// Example 8: Simulating Network Latency
// ============================================================================

console.log('\nExample 8: Simulating Network Latency');
console.log('======================================\n');

const delayedClient = new MockClient({
  delay: 50, // 50ms delay
});

delayedClient.register(getUserConfig, {
  id: '999',
  name: 'Delayed User',
  email: 'delayed@example.com',
});

console.log('Starting request with 50ms delay...');
const startTime = Date.now();
const delayedUser = await delayedClient.run(getUserConfig, {
  params: { id: '999' },
});
const endTime = Date.now();

console.log(`Request took ${endTime - startTime}ms`);
console.log('User:', delayedUser);

console.log('\n✅ All examples completed!');

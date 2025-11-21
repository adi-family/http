/**
 * Mock Generation Example
 *
 * This example demonstrates how to use the mock generation utilities
 * from @adi-family/http for testing your HTTP handlers and clients.
 */

import { z } from 'zod';
import { handler } from '../packages/http/src/handler';
import {
  generateMockData,
  generateMockDataArray,
  createMockHandler,
  createSpyHandler,
  generateMockRequest,
  generateMockResponse,
  generateMockScenario,
  createMockContext,
  presets,
} from '../packages/http/src/mock';

// ============================================================================
// 1. Define your schemas and configs (same as in production)
// ============================================================================

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  createdAt: z.date(),
  status: z.enum(['active', 'archived', 'draft']),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
});

const createProjectConfig = {
  method: 'POST' as const,
  route: {
    type: 'static' as const,
    path: '/projects',
  },
  body: {
    schema: z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  },
  response: {
    schema: projectSchema,
  },
};

const getProjectConfig = {
  method: 'GET' as const,
  route: {
    type: 'pattern' as const,
    pattern: '/projects/:id',
    params: z.object({ id: z.string().uuid() }),
  },
  response: {
    schema: projectSchema,
  },
};

const listProjectsConfig = {
  method: 'GET' as const,
  route: {
    type: 'static' as const,
    path: '/projects',
  },
  query: {
    schema: z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      status: z.enum(['active', 'archived', 'draft']).optional(),
    }),
  },
  response: {
    schema: z.object({
      projects: z.array(projectSchema),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
      }),
    }),
  },
};

// ============================================================================
// 2. Generate Mock Data
// ============================================================================

console.log('=== Mock Data Generation ===\n');

// Generate a single mock project
const mockProject = generateMockData(projectSchema);
console.log('Generated mock project:', mockProject);

// Generate with a seed for deterministic results
const mockProject1 = generateMockData(projectSchema, { seed: 12345 });
const mockProject2 = generateMockData(projectSchema, { seed: 12345 });
console.log('Same seed produces same data:', mockProject1.id === mockProject2.id);

// Generate with overrides
const mockProjectWithOverrides = generateMockData(projectSchema, {
  overrides: {
    name: 'My Custom Project',
    status: 'active',
  },
});
console.log('Mock with overrides:', mockProjectWithOverrides.name);

// Generate multiple items
const mockProjects = generateMockDataArray(projectSchema, 5);
console.log(`Generated ${mockProjects.length} projects\n`);

// ============================================================================
// 3. Generate Mock Requests and Responses
// ============================================================================

console.log('=== Mock Request/Response Generation ===\n');

// Generate mock request data
const mockCreateRequest = generateMockRequest(createProjectConfig);
console.log('Mock create request:', mockCreateRequest);

// Generate mock response
const mockGetResponse = generateMockResponse(getProjectConfig);
console.log('Mock get response:', mockGetResponse);

// Generate complete scenario
const scenario = generateMockScenario(getProjectConfig);
console.log('Complete scenario:', scenario);

// ============================================================================
// 4. Create Mock Handlers
// ============================================================================

console.log('\n=== Mock Handlers ===\n');

// Create a mock handler with static data
const staticMockHandler = createMockHandler(getProjectConfig, {
  data: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Project',
    createdAt: new Date(),
    status: 'active',
    tags: ['test', 'example'],
  },
});

console.log('Created static mock handler:', staticMockHandler.config.method);

// Create a mock handler with auto-generated data
const autoMockHandler = createMockHandler(getProjectConfig);

// Create a mock handler with custom logic
const customMockHandler = createMockHandler(getProjectConfig, {
  respond: async (ctx) => ({
    id: ctx.params.id,
    name: `Project ${ctx.params.id}`,
    createdAt: new Date(),
    status: 'active',
    tags: [],
  }),
});

// Create a mock handler with simulated delay and errors
const slowMockHandler = createMockHandler(getProjectConfig, {
  delay: 100, // 100ms delay
  errorProbability: 0.1, // 10% chance of error
});

// ============================================================================
// 5. Use Spy Handlers for Testing
// ============================================================================

console.log('\n=== Spy Handlers ===\n');

const spyHandler = createSpyHandler(createProjectConfig, {
  respond: async (ctx) => ({
    id: presets.id(),
    name: ctx.body.name,
    description: ctx.body.description,
    createdAt: new Date(),
    status: 'draft',
    tags: ctx.body.tags || [],
  }),
});

// Simulate some calls
async function simulateCalls() {
  await spyHandler.fn({
    params: undefined as never,
    query: undefined as never,
    body: { name: 'Project 1', tags: ['tag1'] },
    headers: new Headers({ authorization: 'Bearer token123' }),
    raw: null,
  });

  await spyHandler.fn({
    params: undefined as never,
    query: undefined as never,
    body: { name: 'Project 2', description: 'Description' },
    headers: new Headers({ authorization: 'Bearer token123' }),
    raw: null,
  });
}

simulateCalls().then(() => {
  console.log('Total calls:', spyHandler.callCount());
  console.log('Last call body:', spyHandler.lastCall()?.body);
  console.log(
    'Was called with Project 1:',
    spyHandler.wasCalledWith({ body: { name: 'Project 1' } })
  );
  console.log(
    'Was called with auth header:',
    spyHandler.wasCalledWith({ headers: { authorization: 'Bearer token123' } })
  );
});

// ============================================================================
// 6. Create Mock Context for Direct Handler Testing
// ============================================================================

console.log('\n=== Mock Context ===\n');

// Create a real handler
const realHandler = handler(createProjectConfig, async (ctx) => {
  return {
    id: presets.id(),
    name: ctx.body.name,
    description: ctx.body.description,
    createdAt: new Date(),
    status: 'draft' as const,
    tags: ctx.body.tags || [],
  };
});

// Test it with a mock context
const mockCtx = createMockContext(createProjectConfig, {
  body: {
    name: 'Test Project',
    description: 'A test project',
    tags: ['test'],
  },
});

realHandler.fn(mockCtx).then((result) => {
  console.log('Handler result:', result.name);
});

// ============================================================================
// 7. Use Presets for Common Patterns
// ============================================================================

console.log('\n=== Presets ===\n');

console.log('Mock ID:', presets.id());
console.log('Mock email:', presets.email());
console.log('Mock URL:', presets.url());
console.log('Mock timestamp:', presets.timestamp());
console.log('Mock pagination:', presets.pagination());
console.log('Mock error:', presets.error());

// ============================================================================
// 8. Integration Testing Example
// ============================================================================

console.log('\n=== Integration Testing Pattern ===\n');

// Example: Testing a client-side function that calls the API
async function createProject(client: any, data: { name: string; description?: string }) {
  return client.run(createProjectConfig, { body: data });
}

// Mock the client's run method
const mockClient = {
  run: createMockHandler(createProjectConfig, {
    respond: async (ctx) => ({
      id: presets.id(12345), // Use seed for deterministic tests
      name: ctx.body.name,
      description: ctx.body.description,
      createdAt: new Date('2024-01-01'),
      status: 'draft' as const,
      tags: ctx.body.tags || [],
    }),
  }).fn,
};

// Now you can test your client-side code
const mockRequestCtx = createMockContext(createProjectConfig, {
  body: {
    name: 'Integration Test Project',
    description: 'Testing the full flow',
  },
});

mockClient.run(mockRequestCtx).then((result) => {
  console.log('Integration test result:', result);
  console.log('✓ Project created successfully with ID:', result.id);
});

// ============================================================================
// 9. Property-Based Testing Example
// ============================================================================

console.log('\n=== Property-Based Testing Pattern ===\n');

// Generate many test cases to verify handler behavior
for (let i = 0; i < 5; i++) {
  const testScenario = generateMockScenario(createProjectConfig, { seed: i });

  // Verify the mock data is valid
  const isValid = createProjectConfig.body?.schema.safeParse(testScenario.request.body);
  console.log(`Test case ${i + 1}: ${isValid?.success ? '✓' : '✗'}`);
}

console.log('\n=== Example Complete ===\n');

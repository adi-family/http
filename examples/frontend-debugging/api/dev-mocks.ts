/**
 * Development Mock Data
 * Configure different scenarios for testing
 */

import { MockClient } from '@adi-family/http-mocks';
import {
  getProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  updateProjectConfig,
  deleteProjectConfig,
  getCurrentUserConfig,
} from './configs';

export function setupMockClient(scenario: string = 'default'): MockClient {
  const mockClient = new MockClient({
    delay: scenario === 'slow' ? 3000 : 500,
    mockOptions: {
      seed: 42, // Deterministic data
    },
  });

  // Setup based on scenario
  switch (scenario) {
    case 'empty':
      setupEmptyScenario(mockClient);
      break;
    case 'error':
      setupErrorScenario(mockClient);
      break;
    case 'large':
      setupLargeDatasetScenario(mockClient);
      break;
    case 'edge':
      setupEdgeCaseScenario(mockClient);
      break;
    default:
      setupDefaultScenario(mockClient);
  }

  return mockClient;
}

// ============================================================================
// Default Scenario
// ============================================================================

function setupDefaultScenario(client: MockClient) {
  // Current user
  client.register(getCurrentUserConfig, {
    id: 'user-1',
    name: 'Dev User',
    email: 'dev@example.com',
    avatar: 'https://i.pravatar.cc/150?u=dev',
    role: 'admin',
  });

  // Projects list
  client.register(getProjectsConfig, ({ query }) => {
    const allProjects = [
      {
        id: '1',
        name: 'Project Alpha',
        description: 'Building a new feature for the platform',
        status: 'active' as const,
        progress: 75,
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-02-20').toISOString(),
      },
      {
        id: '2',
        name: 'Project Beta',
        description: 'Redesigning the user interface',
        status: 'pending' as const,
        progress: 20,
        createdAt: new Date('2024-02-01').toISOString(),
        updatedAt: new Date('2024-02-15').toISOString(),
      },
      {
        id: '3',
        name: 'Project Gamma',
        description: 'Performance optimization work',
        status: 'completed' as const,
        progress: 100,
        createdAt: new Date('2023-12-01').toISOString(),
        updatedAt: new Date('2024-01-10').toISOString(),
      },
    ];

    let filtered = allProjects;
    if (query?.status) {
      filtered = allProjects.filter((p) => p.status === query.status);
    }

    if (query?.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return { projects: filtered };
  });

  // Single project
  client.register(getProjectConfig, ({ params }) => ({
    id: params.id,
    name: `Project ${params.id}`,
    description: 'Detailed project description',
    status: 'active' as const,
    progress: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Create project
  client.register(createProjectConfig, ({ body }) => ({
    id: `project-${Date.now()}`,
    name: body.name,
    description: body.description,
    status: 'pending' as const,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Update project
  client.register(updateProjectConfig, ({ params, body }) => ({
    id: params.id,
    name: body.name ?? 'Updated Project',
    description: body.description ?? 'Updated description',
    status: body.status ?? 'active',
    progress: body.progress ?? 50,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Delete project
  client.register(deleteProjectConfig, () => ({ success: true }));
}

// ============================================================================
// Empty Scenario - Test empty states
// ============================================================================

function setupEmptyScenario(client: MockClient) {
  client.register(getCurrentUserConfig, {
    id: 'user-1',
    name: 'Dev User',
    email: 'dev@example.com',
    role: 'user',
  });

  client.register(getProjectsConfig, { projects: [] });
}

// ============================================================================
// Error Scenario - Test error handling
// ============================================================================

function setupErrorScenario(client: MockClient) {
  client.register(getCurrentUserConfig, () => {
    throw new Error('Failed to fetch user: Network error');
  });

  client.register(getProjectsConfig, () => {
    throw new Error('Failed to fetch projects: Server error');
  });

  client.register(createProjectConfig, () => {
    throw new Error('Failed to create project: Validation error');
  });
}

// ============================================================================
// Large Dataset Scenario - Test performance
// ============================================================================

function setupLargeDatasetScenario(client: MockClient) {
  client.register(getCurrentUserConfig, {
    id: 'user-1',
    name: 'Dev User',
    email: 'dev@example.com',
    role: 'admin',
  });

  client.register(getProjectsConfig, {
    projects: Array.from({ length: 1000 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Project ${i + 1}`,
      description: `Description for project ${i + 1}`,
      status: ['active', 'pending', 'completed'][i % 3] as
        | 'active'
        | 'pending'
        | 'completed',
      progress: Math.floor((i % 100)),
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
    })),
  });
}

// ============================================================================
// Edge Case Scenario - Test UI edge cases
// ============================================================================

function setupEdgeCaseScenario(client: MockClient) {
  client.register(getCurrentUserConfig, {
    id: 'user-1',
    name: 'User with a very very very very long name that might break the UI',
    email: 'very.long.email.address.that.might.cause.issues@example.com',
    role: 'admin',
  });

  client.register(getProjectsConfig, {
    projects: [
      {
        id: '1',
        name: 'A'.repeat(100), // Very long name
        description: 'B'.repeat(500), // Very long description
        status: 'active' as const,
        progress: 99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: '🚀 Project with Emoji 🎉',
        description: 'Testing emoji support 😀 🎨 ✨',
        status: 'pending' as const,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        name: '<script>alert("xss")</script>',
        description: 'Test & "special" \'characters\' <tag>',
        status: 'completed' as const,
        progress: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '4',
        name: '',
        description: '',
        status: 'active' as const,
        progress: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}

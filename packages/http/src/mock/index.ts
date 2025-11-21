/**
 * Mock Generation Utilities for @adi-family/http
 *
 * This module provides comprehensive mock generation capabilities for testing
 * HTTP handlers and clients. All mock data is generated from Zod schemas,
 * ensuring type safety and consistency with your API contracts.
 *
 * @example
 * ```ts
 * import { generateMockData, createMockHandler, createSpyHandler } from '@adi-family/http/mock';
 *
 * // Generate mock data from schemas
 * const mockProject = generateMockData(projectSchema);
 *
 * // Create mock handlers for testing
 * const mockHandler = createMockHandler(getProjectConfig, {
 *   data: { id: '123', name: 'Test Project' }
 * });
 *
 * // Create spy handlers for assertions
 * const spyHandler = createSpyHandler(createProjectConfig);
 * ```
 *
 * @module @adi-family/http/mock
 */

// Export mock data generators
export {
  generateMockData,
  generateMockDataArray,
  type MockGeneratorOptions,
} from './generators';

// Export mock handler utilities
export {
  createMockHandler,
  createSpyHandler,
  createMockHandlers,
  type MockHandlerOptions,
  type RequestMatcher,
  type RecordedRequest,
  type SpiedMockHandler,
} from './handler-mock';

// Export utility functions
export {
  generateMockRequest,
  generateMockResponse,
  generateMockScenario,
  generateMockScenarios,
  createMockContext,
  validateMockData,
  assertValidMockData,
  presets,
} from './utils';

/**
 * @adi-family/http-mocks
 *
 * Mock generation utilities for @adi-family/http
 * Perfect for testing and development without real HTTP requests
 */

export {
  generateMock,
  type MockGeneratorOptions,
} from './zod-mock-generator';

export {
  createMockContext,
  createMockHandler,
  createMockHandlerFactory,
} from './mock-handler';

export {
  MockClient,
  type MockClientConfig,
} from './mock-client';

import type { HandlerConfig, Handler } from '@adi-family/http';
import { generateMock, type MockGeneratorOptions } from './zod-mock-generator';
import { createMockContext } from './mock-handler';

/**
 * Configuration for the mock client
 */
export interface MockClientConfig {
  /**
   * Base URL for the client (not used in mocks, but kept for compatibility)
   */
  baseUrl?: string;

  /**
   * Default headers (not used in mocks, but kept for compatibility)
   */
  headers?: Record<string, string>;

  /**
   * Options for mock data generation
   */
  mockOptions?: MockGeneratorOptions;

  /**
   * Whether to validate responses with schemas (default: true)
   */
  validateResponses?: boolean;

  /**
   * Default delay in milliseconds to simulate network latency (default: 0)
   */
  delay?: number;
}

/**
 * Mock HTTP client that returns mock data without making real HTTP requests
 * Perfect for testing and development
 *
 * @example
 * ```typescript
 * const mockClient = new MockClient();
 *
 * // Register a handler with custom mock data
 * mockClient.register(getProjectConfig, {
 *   id: '123',
 *   name: 'Mock Project'
 * });
 *
 * // Use it like a normal client
 * const project = await mockClient.run(getProjectConfig, {
 *   params: { id: '123' }
 * });
 * ```
 */
export class MockClient {
  private handlers = new Map<
    HandlerConfig<any, any, any, any>,
    Handler<any, any, any, any>
  >();
  private responseOverrides = new Map<HandlerConfig<any, any, any, any>, any>();
  private config: Required<MockClientConfig>;

  constructor(config: MockClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? 'http://mock.test',
      headers: config.headers ?? {},
      mockOptions: config.mockOptions ?? {},
      validateResponses: config.validateResponses ?? true,
      delay: config.delay ?? 0,
    };
  }

  /**
   * Register a handler with mock response data
   *
   * @param handlerConfig - The handler configuration
   * @param response - The mock response data or a function that returns it
   */
  register<TParams, TQuery, TBody, TResponse>(
    handlerConfig: HandlerConfig<TParams, TQuery, TBody, TResponse>,
    response: TResponse | ((options: { params?: TParams; query?: TQuery; body?: TBody }) => TResponse | Promise<TResponse>)
  ): this {
    this.responseOverrides.set(handlerConfig, response);
    return this;
  }

  /**
   * Register a handler instance
   *
   * @param handler - The complete handler with config and function
   */
  registerHandler<TParams, TQuery, TBody, TResponse>(
    handler: Handler<TParams, TQuery, TBody, TResponse>
  ): this {
    this.handlers.set(handler.config, handler);
    return this;
  }

  /**
   * Clear all registered handlers and overrides
   */
  clear(): this {
    this.handlers.clear();
    this.responseOverrides.clear();
    return this;
  }

  /**
   * Execute a request using a handler config (returns mock data)
   *
   * @param handlerConfig - The handler configuration
   * @param options - Request options (params, query, body)
   * @returns The mock response
   */
  async run<TParams, TQuery, TBody, TResponse>(
    handlerConfig: HandlerConfig<TParams, TQuery, TBody, TResponse>,
    options: {
      params?: TParams;
      query?: TQuery;
      body?: TBody;
    } = {}
  ): Promise<TResponse> {
    // Simulate network delay if configured
    if (this.config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delay));
    }

    // Validate query params if schema exists
    if (options.query && handlerConfig.query) {
      try {
        options.query = handlerConfig.query.schema.parse(options.query) as TQuery;
      } catch (error) {
        throw new Error(
          `Mock client: Query validation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Validate body if schema exists
    if (options.body !== undefined && handlerConfig.body) {
      try {
        options.body = handlerConfig.body.schema.parse(options.body) as TBody;
      } catch (error) {
        throw new Error(
          `Mock client: Body validation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    let response: TResponse;

    // Check if there's a registered handler
    const handler = this.handlers.get(handlerConfig);
    if (handler) {
      const ctx = createMockContext(
        handlerConfig,
        {
          params: options.params,
          query: options.query,
          body: options.body,
        },
        this.config.mockOptions
      );
      response = await handler.fn(ctx);
    }
    // Check if there's a response override
    else if (this.responseOverrides.has(handlerConfig)) {
      const override = this.responseOverrides.get(handlerConfig);
      response =
        typeof override === 'function'
          ? await override(options)
          : override;
    }
    // Generate mock data from response schema
    else if (handlerConfig.response?.schema) {
      response = generateMock(
        handlerConfig.response.schema,
        this.config.mockOptions
      ) as TResponse;
    }
    // No schema and no override, return empty object
    else {
      response = {} as TResponse;
    }

    // Validate response if enabled and schema exists
    if (this.config.validateResponses && handlerConfig.response?.schema) {
      try {
        response = handlerConfig.response.schema.parse(response) as TResponse;
      } catch (error) {
        throw new Error(
          `Mock client: Response validation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return response;
  }

  /**
   * Create a spy that tracks all calls to the mock client
   */
  createSpy() {
    const calls: Array<{
      config: HandlerConfig<any, any, any, any>;
      options: any;
      response: any;
      timestamp: Date;
    }> = [];

    const originalRun = this.run.bind(this);
    this.run = async (config, options) => {
      const response = await originalRun(config, options);
      calls.push({
        config,
        options: options ?? {},
        response,
        timestamp: new Date(),
      });
      return response;
    };

    return {
      calls,
      reset: () => {
        calls.length = 0;
      },
      getCallCount: () => calls.length,
      getLastCall: () => calls[calls.length - 1],
      getCalls: () => [...calls],
    };
  }
}

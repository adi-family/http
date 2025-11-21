import type { Handler, HandlerConfig, HandlerFunction } from '../types';
import { generateMockData } from './generators';

/**
 * Options for creating a mock handler
 */
export interface MockHandlerOptions<TResponse = any> {
  /**
   * Static response data to return
   * If provided, this will be returned instead of generating mock data
   */
  data?: TResponse;

  /**
   * Custom response function that receives the context and returns the response
   * Overrides both data and auto-generation
   */
  respond?: HandlerFunction<any, any, any, TResponse>;

  /**
   * Simulated network delay in milliseconds
   * @default 0
   */
  delay?: number;

  /**
   * Simulated error to throw
   * Can be an Error instance or a function that returns an Error
   */
  error?: Error | ((ctx: any) => Error);

  /**
   * Error probability (0-1)
   * If set, the handler will randomly throw errors with this probability
   * @default 0
   */
  errorProbability?: number;

  /**
   * Seed for mock data generation (used when auto-generating response)
   */
  seed?: number;

  /**
   * HTTP status code to simulate
   * @default 200
   */
  statusCode?: number;
}

/**
 * Creates a mock handler that returns predefined or generated data
 *
 * Useful for testing client code without a real server implementation.
 *
 * @example
 * ```ts
 * const getProjectConfig = {
 *   method: 'GET',
 *   route: { type: 'pattern', pattern: '/projects/:id', params: z.object({ id: z.string() }) },
 *   response: { schema: z.object({ id: z.string(), name: z.string() }) }
 * };
 *
 * // With static data
 * const mockHandler = createMockHandler(getProjectConfig, {
 *   data: { id: '123', name: 'Test Project' }
 * });
 *
 * // With auto-generated data
 * const mockHandler = createMockHandler(getProjectConfig);
 *
 * // With custom response function
 * const mockHandler = createMockHandler(getProjectConfig, {
 *   respond: async (ctx) => ({
 *     id: ctx.params.id,
 *     name: `Project ${ctx.params.id}`
 *   })
 * });
 * ```
 */
export function createMockHandler<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  options: MockHandlerOptions<TResponse> = {}
): Handler<TParams, TQuery, TBody, TResponse> {
  const {
    data,
    respond,
    delay = 0,
    error,
    errorProbability = 0,
    seed,
    statusCode = 200,
  } = options;

  const handlerFn: HandlerFunction<TParams, TQuery, TBody, TResponse> = async (ctx) => {
    // Simulate network delay
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Handle error simulation
    if (error) {
      const errorToThrow = typeof error === 'function' ? error(ctx) : error;
      throw errorToThrow;
    }

    // Random error simulation
    if (errorProbability > 0 && Math.random() < errorProbability) {
      throw new Error('Simulated random error');
    }

    // Custom response function
    if (respond) {
      return respond(ctx);
    }

    // Static data
    if (data !== undefined) {
      return data;
    }

    // Auto-generate from response schema
    if (config.response?.schema) {
      return generateMockData(config.response.schema, { seed });
    }

    // No response schema, return empty object
    return {} as TResponse;
  };

  return {
    config,
    fn: handlerFn,
  };
}

/**
 * Request matcher for tracking and asserting on mock handler calls
 */
export interface RequestMatcher<TParams = any, TQuery = any, TBody = any> {
  params?: Partial<TParams>;
  query?: Partial<TQuery>;
  body?: Partial<TBody>;
  headers?: Record<string, string>;
}

/**
 * Recorded request information
 */
export interface RecordedRequest<TParams = any, TQuery = any, TBody = any> {
  params: TParams;
  query: TQuery;
  body: TBody;
  headers: Headers;
  timestamp: number;
}

/**
 * Spied mock handler that records all requests
 */
export interface SpiedMockHandler<TParams = any, TQuery = any, TBody = any, TResponse = any>
  extends Handler<TParams, TQuery, TBody, TResponse> {
  /**
   * Array of all recorded requests
   */
  calls: RecordedRequest<TParams, TQuery, TBody>[];

  /**
   * Reset the recorded calls
   */
  reset: () => void;

  /**
   * Check if the handler was called with specific criteria
   */
  wasCalledWith: (matcher: RequestMatcher<TParams, TQuery, TBody>) => boolean;

  /**
   * Get the number of times the handler was called
   */
  callCount: () => number;

  /**
   * Get the last call
   */
  lastCall: () => RecordedRequest<TParams, TQuery, TBody> | undefined;
}

/**
 * Creates a spy mock handler that records all requests for testing assertions
 *
 * @example
 * ```ts
 * const spyHandler = createSpyHandler(createProjectConfig, {
 *   data: { id: '123', name: 'Test Project' }
 * });
 *
 * // Use the handler...
 * await spyHandler.fn({ params: {}, query: {}, body: { name: 'New Project' }, headers: new Headers(), raw: null });
 *
 * // Assert on calls
 * expect(spyHandler.callCount()).toBe(1);
 * expect(spyHandler.wasCalledWith({ body: { name: 'New Project' } })).toBe(true);
 * expect(spyHandler.lastCall()?.body).toEqual({ name: 'New Project' });
 * ```
 */
export function createSpyHandler<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  options: MockHandlerOptions<TResponse> = {}
): SpiedMockHandler<TParams, TQuery, TBody, TResponse> {
  const mockHandler = createMockHandler(config, options);
  const calls: RecordedRequest<TParams, TQuery, TBody>[] = [];

  const spiedFn: HandlerFunction<TParams, TQuery, TBody, TResponse> = async (ctx) => {
    // Record the call
    calls.push({
      params: ctx.params,
      query: ctx.query,
      body: ctx.body,
      headers: ctx.headers,
      timestamp: Date.now(),
    });

    // Call the original handler
    return mockHandler.fn(ctx);
  };

  return {
    config: mockHandler.config,
    fn: spiedFn,
    calls,
    reset: () => {
      calls.length = 0;
    },
    wasCalledWith: (matcher: RequestMatcher<TParams, TQuery, TBody>) => {
      return calls.some((call) => {
        if (matcher.params && !matchesPartial(call.params, matcher.params)) {
          return false;
        }
        if (matcher.query && !matchesPartial(call.query, matcher.query)) {
          return false;
        }
        if (matcher.body && !matchesPartial(call.body, matcher.body)) {
          return false;
        }
        if (matcher.headers) {
          for (const [key, value] of Object.entries(matcher.headers)) {
            if (call.headers.get(key) !== value) {
              return false;
            }
          }
        }
        return true;
      });
    },
    callCount: () => calls.length,
    lastCall: () => calls[calls.length - 1],
  };
}

/**
 * Helper function to check if an object matches a partial pattern
 */
function matchesPartial(obj: any, partial: any): boolean {
  if (obj === partial) return true;
  if (typeof obj !== 'object' || typeof partial !== 'object') return false;
  if (obj === null || partial === null) return obj === partial;

  for (const key in partial) {
    if (!(key in obj)) return false;
    if (typeof partial[key] === 'object' && partial[key] !== null) {
      if (!matchesPartial(obj[key], partial[key])) return false;
    } else if (obj[key] !== partial[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Creates multiple mock handlers from configs
 *
 * @example
 * ```ts
 * const mocks = createMockHandlers([
 *   { config: getProjectConfig, options: { data: mockProject } },
 *   { config: listProjectsConfig, options: { data: [mockProject] } },
 * ]);
 * ```
 */
export function createMockHandlers<T extends Array<{
  config: HandlerConfig<any, any, any, any>;
  options?: MockHandlerOptions<any>;
}>>(
  handlers: T
): Handler<any, any, any, any>[] {
  return handlers.map(({ config, options }) => createMockHandler(config, options));
}

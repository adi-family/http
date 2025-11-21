import { z } from 'zod';
import type { HandlerConfig } from '../types';
import { generateMockData, type MockGeneratorOptions } from './generators';

/**
 * Generate mock request data (params, query, body) from a handler config
 *
 * @example
 * ```ts
 * const createProjectConfig = {
 *   method: 'POST',
 *   route: { type: 'static', path: '/projects' },
 *   body: { schema: z.object({ name: z.string() }) },
 *   response: { schema: z.object({ id: z.string(), name: z.string() }) }
 * };
 *
 * const mockRequest = generateMockRequest(createProjectConfig);
 * // => { params: undefined, query: undefined, body: { name: "..." } }
 * ```
 */
export function generateMockRequest<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  options: MockGeneratorOptions = {}
): {
  params?: TParams;
  query?: TQuery;
  body?: TBody;
} {
  const result: any = {};

  // Generate params if route has params schema
  if (config.route.type !== 'static' && 'params' in config.route) {
    result.params = generateMockData(config.route.params, options);
  }

  // Generate query if config has query schema
  if (config.query?.schema) {
    result.query = generateMockData(config.query.schema, options);
  }

  // Generate body if config has body schema
  if (config.body?.schema) {
    result.body = generateMockData(config.body.schema, options);
  }

  return result;
}

/**
 * Generate mock response data from a handler config
 *
 * @example
 * ```ts
 * const mockResponse = generateMockResponse(getProjectConfig);
 * // => { id: "uuid...", name: "...", created_at: "..." }
 * ```
 */
export function generateMockResponse<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  options: MockGeneratorOptions = {}
): TResponse | undefined {
  if (!config.response?.schema) {
    return undefined;
  }

  return generateMockData(config.response.schema, options);
}

/**
 * Generate complete mock scenario (request + response) from a handler config
 *
 * @example
 * ```ts
 * const scenario = generateMockScenario(createProjectConfig);
 * // => {
 * //   request: { params: undefined, query: undefined, body: { name: "..." } },
 * //   response: { id: "...", name: "...", created_at: "..." }
 * // }
 * ```
 */
export function generateMockScenario<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  options: MockGeneratorOptions = {}
): {
  request: {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
  };
  response?: TResponse;
} {
  return {
    request: generateMockRequest(config, options),
    response: generateMockResponse(config, options),
  };
}

/**
 * Generate multiple mock scenarios with different seeds
 *
 * @example
 * ```ts
 * const scenarios = generateMockScenarios(createProjectConfig, 5);
 * // => [
 * //   { request: {...}, response: {...} },
 * //   { request: {...}, response: {...} },
 * //   ...
 * // ]
 * ```
 */
export function generateMockScenarios<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  count: number,
  baseOptions: MockGeneratorOptions = {}
): Array<{
  request: {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
  };
  response?: TResponse;
}> {
  return Array.from({ length: count }, (_, i) => {
    const seed = (baseOptions.seed ?? Date.now()) + i * 1000;
    return generateMockScenario(config, { ...baseOptions, seed });
  });
}

/**
 * Create a mock context for testing handler functions directly
 *
 * @example
 * ```ts
 * const ctx = createMockContext(createProjectConfig, {
 *   body: { name: 'Custom Project Name' }
 * });
 *
 * const result = await myHandler.fn(ctx);
 * ```
 */
export function createMockContext<
  TParams = any,
  TQuery = any,
  TBody = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, any>,
  overrides?: {
    params?: Partial<TParams>;
    query?: Partial<TQuery>;
    body?: Partial<TBody>;
    headers?: Record<string, string>;
    raw?: unknown;
  }
): {
  params: TParams;
  query: TQuery;
  body: TBody;
  headers: Headers;
  raw: unknown;
} {
  const mockRequest = generateMockRequest(config);

  const headers = new Headers();
  if (overrides?.headers) {
    for (const [key, value] of Object.entries(overrides.headers)) {
      headers.set(key, value);
    }
  }

  return {
    params: { ...mockRequest.params, ...overrides?.params } as TParams,
    query: { ...mockRequest.query, ...overrides?.query } as TQuery,
    body: { ...mockRequest.body, ...overrides?.body } as TBody,
    headers,
    raw: overrides?.raw ?? null,
  };
}

/**
 * Preset mock data generators for common patterns
 */
export const presets = {
  /**
   * Generate a mock ID (UUID format)
   */
  id: (seed?: number): string => {
    return generateMockData(z.string().uuid(), { seed });
  },

  /**
   * Generate a mock email
   */
  email: (seed?: number): string => {
    return generateMockData(z.string().email(), { seed });
  },

  /**
   * Generate a mock URL
   */
  url: (seed?: number): string => {
    return generateMockData(z.string().url(), { seed });
  },

  /**
   * Generate a mock date
   */
  date: (seed?: number): Date => {
    return generateMockData(z.date(), { seed });
  },

  /**
   * Generate a mock timestamp
   */
  timestamp: (seed?: number): string => {
    return generateMockData(z.date(), { seed }).toISOString();
  },

  /**
   * Generate mock pagination data
   */
  pagination: (seed?: number) => {
    return generateMockData(
      z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1).max(100),
        total: z.number().int().min(0),
        totalPages: z.number().int().min(0),
      }),
      { seed }
    );
  },

  /**
   * Generate a mock error response
   */
  error: (seed?: number) => {
    return generateMockData(
      z.object({
        error: z.string(),
        message: z.string(),
        statusCode: z.number().int().min(400).max(599),
      }),
      { seed }
    );
  },
};

/**
 * Validate that generated mock data conforms to the schema
 *
 * Useful for testing that your mock generation is working correctly
 *
 * @example
 * ```ts
 * const mockData = generateMockData(schema);
 * const isValid = validateMockData(schema, mockData);
 * // => true
 * ```
 */
export function validateMockData<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): data is z.infer<T> {
  const result = schema.safeParse(data);
  return result.success;
}

/**
 * Assert that generated mock data is valid, throw if not
 *
 * @example
 * ```ts
 * const mockData = generateMockData(schema);
 * assertValidMockData(schema, mockData); // throws if invalid
 * ```
 */
export function assertValidMockData<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): asserts data is z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Generated mock data is invalid:\n${JSON.stringify(result.error.issues, null, 2)}`
    );
  }
}

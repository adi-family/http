import type {
  Handler,
  HandlerConfig,
  HandlerContext,
  HandlerFunction,
} from '@adi-family/http';
import { generateMock, type MockGeneratorOptions } from './zod-mock-generator';

/**
 * Creates a mock handler context with generated or provided data
 */
export function createMockContext<TParams = any, TQuery = any, TBody = any>(
  config: HandlerConfig<TParams, TQuery, TBody, any>,
  overrides?: Partial<HandlerContext<TParams, TQuery, TBody>>,
  options?: MockGeneratorOptions
): HandlerContext<TParams, TQuery, TBody> {
  // Generate mock data based on schemas
  const params =
    overrides?.params ??
    (config.route.type !== 'static' && config.route.params
      ? generateMock(config.route.params, options)
      : ({} as TParams));

  const query =
    overrides?.query ??
    (config.query
      ? generateMock(config.query.schema, options)
      : ({} as TQuery));

  const body =
    overrides?.body ??
    (config.body
      ? generateMock(config.body.schema, options)
      : (undefined as TBody));

  const headers = overrides?.headers ?? new Headers();
  const raw = overrides?.raw ?? {};

  return {
    params,
    query,
    body,
    headers,
    raw,
  };
}

/**
 * Creates a mock handler that returns generated data based on the response schema
 */
export function createMockHandler<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  responseOverride?: TResponse | ((ctx: HandlerContext<TParams, TQuery, TBody>) => TResponse | Promise<TResponse>),
  options?: MockGeneratorOptions
): Handler<TParams, TQuery, TBody, TResponse> {
  const fn: HandlerFunction<TParams, TQuery, TBody, TResponse> = async (ctx) => {
    // If responseOverride is provided as a function, call it
    if (typeof responseOverride === 'function') {
      return responseOverride(ctx);
    }

    // If responseOverride is provided as data, return it
    if (responseOverride !== undefined) {
      return responseOverride;
    }

    // Generate mock response from schema
    if (config.response?.schema) {
      return generateMock(config.response.schema, options) as TResponse;
    }

    // No schema and no override, return empty object
    return {} as TResponse;
  };

  return {
    config: {
      method: 'GET',
      ...config,
    },
    fn,
  };
}

/**
 * Creates a mock handler factory that allows easy creation of handlers with custom data
 */
export function createMockHandlerFactory<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  options?: MockGeneratorOptions
) {
  return {
    /**
     * Creates a handler that returns the provided response
     */
    withResponse: (response: TResponse) => createMockHandler(config, response, options),

    /**
     * Creates a handler that returns a dynamically generated response
     */
    withResponseFn: (
      fn: (ctx: HandlerContext<TParams, TQuery, TBody>) => TResponse | Promise<TResponse>
    ) => createMockHandler(config, fn, options),

    /**
     * Creates a handler that generates data from the response schema
     */
    withGeneratedResponse: () => createMockHandler(config, undefined, options),

    /**
     * Creates a mock context for testing
     */
    createContext: (overrides?: Partial<HandlerContext<TParams, TQuery, TBody>>) =>
      createMockContext(config, overrides, options),
  };
}

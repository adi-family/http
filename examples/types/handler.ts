/**
 * Handler Factory Function
 * handler-creation, server-side
 */

import type { Handler, HandlerConfig, HandlerFunction } from './core'

/**
 * Creates a handler by combining a config with a handler function
 *
 * @param config - The handler configuration (shared with client)
 * @param fn - The server-side handler function
 * @returns A complete handler ready to be served
 *
 * @example
 * ```typescript
 * const getProjectHandler = handler(
 *   {
 *     method: 'GET',
 *     params: {
 *       schema: z.object({ id: z.string() }),
 *       pattern: '/projects/:id',
 *       build: (params) => `/projects/${params.id}`
 *     },
 *     response: {
 *       schema: z.object({ id: z.string(), name: z.string() })
 *     }
 *   },
 *   async (ctx) => {
 *     const project = await db.findProject(ctx.params.id)
 *     return project
 *   }
 * )
 * ```
 */
export function handler<
  TParams = {},
  TQuery = {},
  TBody = unknown,
  TResponse = unknown
>(
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>,
  fn: HandlerFunction<TParams, TQuery, TBody, TResponse>
): Handler<TParams, TQuery, TBody, TResponse> {
  // Validate config
  if (!config.url && !config.params) {
    throw new Error('Either url or params.build must be provided')
  }

  if (config.url && config.params) {
    throw new Error('Cannot provide both url and params')
  }

  return {
    config: {
      method: 'GET',
      ...config
    },
    fn
  }
}

/**
 * Route Builder for @adi-family/http
 * route-builder, url-routing, type-safe
 */

import type { ZodSchema } from 'zod'
import type { RouteConfig } from './types'

/**
 * Build URL from pattern and params
 * Replaces :paramName with actual values
 *
 * @example
 * buildUrlFromPattern('/api/users/:id', { id: '123' })
 * // => '/api/users/123'
 */
function buildUrlFromPattern(
  pattern: string,
  params: Record<string, any>
): string {
  return pattern.replace(/:(\w+)/g, (match, paramName) => {
    const value = params[paramName]
    if (value === undefined || value === null) {
      throw new Error(
        `Missing required parameter: "${paramName}" in route pattern "${pattern}"`
      )
    }
    return encodeURIComponent(String(value))
  })
}

/**
 * Parse params from URL using pattern
 * Extracts values from URL based on :paramName placeholders
 *
 * @example
 * parseParamsFromPattern('/api/users/:id', new URL('http://localhost/api/users/123'))
 * // => { id: '123' }
 */
export function parseParamsFromPattern(
  pattern: string,
  url: URL
): Record<string, string> | null {
  // Convert pattern to regex
  // /api/users/:id -> /^\/api\/users\/([^/]+)$/
  const paramNames: string[] = []
  const regexPattern = pattern.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name)
    return '([^/]+)'
  })

  const regex = new RegExp(`^${regexPattern}$`)
  const match = url.pathname.match(regex)

  if (!match) return null

  const params: Record<string, string> = {}
  paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1])
  })

  return params
}

/**
 * Check if URL matches pattern
 *
 * @example
 * isPatternMatch('/api/users/:id', new URL('http://localhost/api/users/123'))
 * // => true
 */
export function isPatternMatch(pattern: string, url: URL): boolean {
  const regexPattern = pattern.replace(/:(\w+)/g, '([^/]+)')
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(url.pathname)
}

/**
 * Route builder namespace for creating route configurations
 *
 * @example
 * ```typescript
 * import { route } from '@adi-family/http'
 *
 * // Static route
 * route.static('/api/users')
 *
 * // Dynamic route
 * route.dynamic('/api/users/:id', z.object({ id: z.string() }))
 *
 * // Custom builder
 * route.withBuilder({
 *   pattern: '/api/users/:id',
 *   params: z.object({ id: z.string() }),
 *   build: (params) => `/custom/${params.id}`
 * })
 *
 * // Full control
 * route.full({
 *   params: z.object({ id: z.string() }),
 *   build: (params) => `/api/users/${params.id}`,
 *   parse: (url) => ({ id: url.pathname.split('/').pop()! }),
 *   is: (url) => /^\/api\/users\/[^/]+$/.test(url.pathname)
 * })
 * ```
 */
export const route = {
  /**
   * Create a static route (no parameters)
   *
   * @param path - The static path
   * @returns Route configuration
   *
   * @example
   * ```typescript
   * route.static('/api/users')
   * route.static('/api/health')
   * ```
   */
  static(path: string): RouteConfig<never> {
    return {
      type: 'static',
      path
    }
  },

  /**
   * Create a dynamic route with parameters
   * Auto-generates build, parse, and is functions from pattern
   *
   * @param pattern - URL pattern with :paramName placeholders
   * @param params - Zod schema for parameter validation
   * @returns Route configuration
   *
   * @example
   * ```typescript
   * route.dynamic('/api/users/:id', z.object({ id: z.string() }))
   *
   * route.dynamic(
   *   '/api/projects/:projectId/tasks/:taskId',
   *   z.object({
   *     projectId: z.string(),
   *     taskId: z.string()
   *   })
   * )
   * ```
   */
  dynamic<TSchema extends ZodSchema>(
    pattern: string,
    params: TSchema
  ): RouteConfig<TSchema['_output']> {
    return {
      type: 'pattern',
      pattern,
      params
    }
  },

  /**
   * Create a route with custom build function
   * Auto-generates parse and is functions from pattern
   *
   * @param config - Configuration with pattern, params, and custom build
   * @returns Route configuration
   *
   * @example
   * ```typescript
   * route.withBuilder({
   *   pattern: '/api/v:version/users/:id',
   *   params: z.object({
   *     version: z.number(),
   *     id: z.string()
   *   }),
   *   build: (params) => {
   *     if (params.version === 1) {
   *       return `/api/legacy/users/${params.id}`
   *     }
   *     return `/api/v${params.version}/users/${params.id}`
   *   }
   * })
   * ```
   */
  withBuilder<TSchema extends ZodSchema>(config: {
    pattern: string
    params: TSchema
    build: (params: TSchema['_output']) => string
  }): RouteConfig<TSchema['_output']> {
    return {
      type: 'pattern',
      pattern: config.pattern,
      params: config.params,
      build: config.build
    }
  },

  /**
   * Create a route with full custom control
   * Provide all functions: build, parse, and is
   *
   * @param config - Complete configuration with all functions
   * @returns Route configuration
   *
   * @example
   * ```typescript
   * // Subdomain-based routing
   * route.full({
   *   params: z.object({
   *     tenant: z.string(),
   *     resource: z.string()
   *   }),
   *   build: (params) => `https://${params.tenant}.api.com/${params.resource}`,
   *   parse: (url) => ({
   *     tenant: url.hostname.split('.')[0],
   *     resource: url.pathname.slice(1)
   *   }),
   *   is: (url) => url.hostname.endsWith('.api.com') && url.pathname !== '/'
   * })
   *
   * // Query-based routing
   * route.full({
   *   params: z.object({
   *     tenantId: z.string(),
   *     userId: z.string()
   *   }),
   *   build: (params) => `/api/users/${params.userId}?tenant=${params.tenantId}`,
   *   parse: (url) => ({
   *     userId: url.pathname.split('/').pop()!,
   *     tenantId: url.searchParams.get('tenant')!
   *   }),
   *   is: (url) => /^\/api\/users\/[^/]+$/.test(url.pathname) &&
   *                url.searchParams.has('tenant')
   * })
   * ```
   */
  full<TSchema extends ZodSchema>(config: {
    params: TSchema
    build: (params: TSchema['_output']) => string
    parse: (url: URL) => TSchema['_output']
    is: (url: URL) => boolean
  }): RouteConfig<TSchema['_output']> {
    return {
      type: 'custom',
      params: config.params,
      build: config.build,
      parse: config.parse,
      is: config.is
    }
  }
}

/**
 * Internal helper to get build function from route config
 * Used by client to build URLs
 */
export function getBuildFunction<TParams>(
  config: RouteConfig<TParams>
): (params: TParams) => string {
  switch (config.type) {
    case 'static':
      return () => config.path

    case 'pattern':
      return config.build || ((params) => buildUrlFromPattern(config.pattern, params as any))

    case 'custom':
      return config.build
  }
}

/**
 * Internal helper to get parse function from route config
 * Used by server to extract params from URL
 */
export function getParseFunction<TParams>(
  config: RouteConfig<TParams>
): (url: URL) => TParams | null {
  switch (config.type) {
    case 'static':
      return () => ({} as TParams)

    case 'pattern':
      return (url) => {
        const parsed = parseParamsFromPattern(config.pattern, url)
        return parsed as TParams | null
      }

    case 'custom':
      return config.parse
  }
}

/**
 * Internal helper to get is-match function from route config
 * Used by server to match incoming requests
 */
export function getIsMatchFunction<TParams>(
  config: RouteConfig<TParams>
): (url: URL) => boolean {
  switch (config.type) {
    case 'static':
      return (url) => url.pathname === config.path

    case 'pattern':
      return (url) => isPatternMatch(config.pattern, url)

    case 'custom':
      return config.is
  }
}

/**
 * Internal helper to get server pattern from route config
 * Used by server adapters (Express, Native) for route registration
 */
export function getServerPattern<TParams>(
  config: RouteConfig<TParams>
): string | null {
  switch (config.type) {
    case 'static':
      return config.path

    case 'pattern':
      return config.pattern

    case 'custom':
      // Custom routes don't have a server pattern
      // Server will need to handle them differently
      return null
  }
}

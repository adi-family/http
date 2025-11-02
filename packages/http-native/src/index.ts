/**
 * Native Node.js HTTP Adapter for @adi-family/http
 * native-adapter, server, node-http
 *
 * Converts handlers into native Node.js HTTP server handlers
 */

import * as http from 'http'
import * as https from 'https'
import type { IncomingMessage, ServerResponse } from 'http'
import type { Handler } from '@adi-family/http'
import { getServerPattern, getIsMatchFunction, getParseFunction } from '@adi-family/http'

/**
 * Options for creating a native HTTP server
 */
export interface NativeServerOptions {
  /**
   * HTTPS options (optional)
   * If provided, creates an HTTPS server instead of HTTP
   */
  https?: https.ServerOptions

  /**
   * Port to listen on
   * @default 3000
   */
  port?: number

  /**
   * Hostname to bind to
   * @default 'localhost'
   */
  hostname?: string

  /**
   * Callback when server starts listening
   */
  onListen?: (port: number, hostname: string) => void
}

/**
 * Route matcher for path patterns
 */
interface RoutePattern {
  regex: RegExp
  paramNames: string[]
}

/**
 * Convert Express-style route pattern to regex
 * Example: /api/users/:id -> /^\/api\/users\/([^\/]+)$/
 */
function patternToRegex(pattern: string): RoutePattern {
  const paramNames: string[] = []
  const regexStr = pattern.replace(/:([^/]+)/g, (_, paramName) => {
    paramNames.push(paramName)
    return '([^/]+)'
  })

  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames
  }
}

/**
 * Match a URL path against a route pattern
 */
function matchRoute(path: string, pattern: RoutePattern): Record<string, string> | null {
  const match = path.match(pattern.regex)
  if (!match) return null

  const params: Record<string, string> = {}
  pattern.paramNames.forEach((name, index) => {
    params[name] = match[index + 1]
  })

  return params
}

/**
 * Parse URL query parameters
 */
function parseQuery(url: string): Record<string, any> {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return {}

  const query: Record<string, any> = {}
  const searchParams = new URLSearchParams(url.slice(queryIndex + 1))

  searchParams.forEach((value, key) => {
    // Try to parse as number if it looks like one
    if (/^\d+$/.test(value)) {
      query[key] = parseInt(value, 10)
    } else if (/^\d+\.\d+$/.test(value)) {
      query[key] = parseFloat(value)
    } else {
      query[key] = value
    }
  })

  return query
}

/**
 * Parse request body as JSON
 */
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      if (!body) {
        resolve(undefined)
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, statusCode: number, data: any): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

/**
 * Create a request handler from handlers array
 */
function createRequestHandler(handlers: Handler<any, any, any, any>[]) {
  // Precompile route patterns
  const routes = handlers.map(handler => {
    const { config } = handler
    const method = (config.method || 'GET').toUpperCase()

    // Get server pattern and matching function from route config
    const serverPattern = getServerPattern(config.route)
    const isMatchFn = getIsMatchFunction(config.route)
    const parseFn = getParseFunction(config.route)

    let pattern: RoutePattern | null = null
    let staticPath: string | null = null

    if (config.route.type === 'static') {
      staticPath = config.route.path
      pattern = { regex: new RegExp(`^${config.route.path}$`), paramNames: [] }
    } else if (config.route.type === 'pattern' && serverPattern) {
      pattern = patternToRegex(serverPattern)
    } else if (config.route.type === 'custom') {
      // Custom routes use the is() function for matching
      pattern = null
    }

    return { handler, method, pattern, staticPath, isMatchFn, parseFn }
  })

  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const method = req.method?.toUpperCase() || 'GET'
      const url = req.url || '/'
      const pathname = url.split('?')[0]

      // Find matching route
      let matchedRoute = null
      let params: any = {}

      const fullUrl = new URL(url, `http://${req.headers.host || 'localhost'}`)

      for (const route of routes) {
        if (route.method !== method) continue

        // Try pattern matching first (if pattern exists)
        if (route.pattern) {
          const matchedParams = matchRoute(pathname, route.pattern)
          if (matchedParams !== null) {
            matchedRoute = route
            params = matchedParams
            break
          }
        } else if (route.isMatchFn) {
          // Use custom is() function for matching
          if (route.isMatchFn(fullUrl)) {
            matchedRoute = route
            // Parse params using custom parse function
            params = route.parseFn(fullUrl)
            break
          }
        }
      }

      if (!matchedRoute) {
        sendJson(res, 404, { error: 'Not Found' })
        return
      }

      const { handler } = matchedRoute
      const { config, fn } = handler

      // Parse query
      let query = parseQuery(url)
      if (config.query) {
        try {
          query = config.query.schema.parse(query)
        } catch (error: any) {
          sendJson(res, 400, {
            error: 'Query validation failed',
            details: error.errors
          })
          return
        }
      }

      // Parse body
      let body = undefined
      if (method !== 'GET' && method !== 'HEAD') {
        body = await parseBody(req)

        if (config.body) {
          try {
            body = config.body.schema.parse(body)
          } catch (error: any) {
            sendJson(res, 400, {
              error: 'Body validation failed',
              details: error.errors
            })
            return
          }
        }
      }

      // Build context
      const headers = new Headers()
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value) {
          headers.set(key, Array.isArray(value) ? value.join(', ') : value)
        }
      })

      const ctx = {
        params,
        query,
        body,
        headers,
        raw: req
      }

      // Execute handler
      const result = await fn(ctx)

      // Validate response
      if (config.response) {
        try {
          config.response.schema.parse(result)
        } catch (error: any) {
          console.error('Response validation failed:', error)
          sendJson(res, 500, {
            error: 'Internal Server Error',
            message: 'Response validation failed'
          })
          return
        }
      }

      // Send response
      sendJson(res, 200, result)

    } catch (error: any) {
      console.error('Handler error:', error)

      // Handle Zod validation errors
      if (error.name === 'ZodError') {
        sendJson(res, 400, {
          error: 'Validation failed',
          details: error.errors
        })
        return
      }

      // Generic error
      sendJson(res, 500, {
        error: 'Internal Server Error',
        message: error.message
      })
    }
  }
}

/**
 * Create and start a native Node.js HTTP server with handlers
 *
 * @param handlers - Array of handlers to serve
 * @param options - Server options
 * @returns The created HTTP or HTTPS server
 *
 * @example
 * ```typescript
 * import { serveNative } from '@adi-family/http-native'
 * import * as handlers from './handlers'
 *
 * const server = serveNative(
 *   [handlers.getUserHandler, handlers.createUserHandler],
 *   {
 *     port: 3000,
 *     hostname: '0.0.0.0',
 *     onListen: (port, hostname) => {
 *       console.log(`Server running on http://${hostname}:${port}`)
 *     }
 *   }
 * )
 * ```
 */
export function serveNative(
  handlers: Handler<any, any, any, any>[],
  options: NativeServerOptions = {}
): http.Server | https.Server {
  const {
    https: httpsOptions,
    port = 3000,
    hostname = 'localhost',
    onListen
  } = options

  const requestHandler = createRequestHandler(handlers)

  const server = httpsOptions
    ? https.createServer(httpsOptions, requestHandler)
    : http.createServer(requestHandler)

  server.listen(port, hostname, () => {
    if (onListen) {
      onListen(port, hostname)
    }
  })

  return server
}

/**
 * Create a request handler without starting the server
 * Useful for testing or custom server setup
 *
 * @param handlers - Array of handlers
 * @returns Request handler function
 *
 * @example
 * ```typescript
 * import http from 'http'
 * import { createHandler } from '@adi-family/http-native'
 * import * as handlers from './handlers'
 *
 * const requestHandler = createHandler([
 *   handlers.getUserHandler,
 *   handlers.createUserHandler
 * ])
 *
 * const server = http.createServer(requestHandler)
 * server.listen(3000)
 * ```
 */
export function createHandler(
  handlers: Handler<any, any, any, any>[]
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return createRequestHandler(handlers)
}

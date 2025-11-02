/**
 * Express Adapter for @adi-family/http
 * express-adapter, server, framework-integration
 *
 * Converts handlers into Express routes
 */

import type { Express, Request, Response, NextFunction } from 'express'
import type { Handler } from '@adi-family/http'
import { getServerPattern } from '@adi-family/http'

/**
 * Serve handlers with Express
 *
 * @param app - Express application
 * @param handlers - Array of handlers to serve
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { serveExpress } from '@adi-family/http-express'
 * import * as handlers from './handlers'
 *
 * const app = express()
 * app.use(express.json())
 *
 * serveExpress(app, [
 *   handlers.listProjectsHandler,
 *   handlers.getProjectHandler,
 *   handlers.createProjectHandler
 * ])
 *
 * app.listen(3000)
 * ```
 */
export function serveExpress(
  app: Express,
  handlers: Handler<any, any, any, any>[]
): void {
  handlers.forEach(handler => {
    const { config, fn } = handler
    const method = (config.method?.toLowerCase() || 'get') as 'get' | 'post' | 'put' | 'patch' | 'delete'

    // Get Express route pattern from route config
    const expressRoute = getServerPattern(config.route)

    if (expressRoute === null) {
      // Custom routes without a pattern - use catch-all
      // Will need manual matching with route.is()
      console.warn('Custom routes (route.full()) are not yet fully supported in Express adapter')
      return
    }

    // Register route
    app[method](expressRoute, async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Parse params from URL using route config
        let params: any = {}
        if (config.route.type !== 'static') {
          // For pattern and custom routes, extract params
          if (config.route.type === 'pattern') {
            // Express already parsed params for us
            params = req.params || {}
          } else if (config.route.type === 'custom') {
            // Use custom parse function
            const url = new URL(req.url, `http://${req.headers.host}`)
            params = config.route.parse(url)
          }
        }

        // Validate and extract query
        let query = req.query
        if (config.query) {
          query = config.query.schema.parse(query)
        }

        // Validate body
        let body = req.body
        if (config.body) {
          body = config.body.schema.parse(body)
        }

        // Build context
        const ctx = {
          params,
          query,
          body,
          headers: new Headers(req.headers as any),
          raw: req
        }

        // Execute handler
        const result = await fn(ctx)

        // Validate response
        if (config.response) {
          config.response.schema.parse(result)
        }

        // Send response
        res.json(result)
      } catch (error: any) {
        // Handle Zod validation errors
        if (error.name === 'ZodError') {
          res.status(400).json({
            error: 'Validation failed',
            details: error.errors
          })
          return
        }

        // Pass to Express error handler
        next(error)
      }
    })
  })
}

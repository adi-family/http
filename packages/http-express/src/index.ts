/**
 * Express Adapter for @adi-family/http
 * express-adapter, server, framework-integration
 *
 * Converts handlers into Express routes
 */

import type { Express, Request, Response, NextFunction } from 'express'
import type { Handler } from '@adi-family/http'

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

    // Determine Express route
    let expressRoute: string
    if (config.url) {
      expressRoute = config.url
    } else if (config.params) {
      expressRoute = config.params.pattern
    } else {
      throw new Error('No route found in handler config')
    }

    // Register route
    app[method](expressRoute, async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract params (no validation!)
        const params = req.params || {}

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

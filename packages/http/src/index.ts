/**
 * @adi-family/http - Framework-Agnostic HTTP Interface
 *
 * A framework-agnostic, type-safe HTTP interface system that separates API contracts
 * from implementation, enabling end-to-end type safety between client and server.
 *
 * @see https://github.com/adi-family/http
 */

// Export all types
export type {
  RouteConfig,
  BodyConfig,
  QueryConfig,
  ResponseConfig,
  HandlerConfig,
  HandlerContext,
  HandlerFunction,
  Handler,
  ClientConfig,
  InferParams,
  InferQuery,
  InferBody,
  InferResponse
} from './types'

// Export route builder
export { route } from './route-builder'

// Export route utilities (for adapters)
export {
  getBuildFunction,
  getParseFunction,
  getIsMatchFunction,
  getServerPattern
} from './route-builder'

// Export handler factory
export { handler } from './handler'

// Export client
export { BaseClient } from './client'

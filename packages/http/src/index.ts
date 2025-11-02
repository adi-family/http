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
  ParamsConfig,
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

// Export handler factory
export { handler } from './handler'

// Export client
export { BaseClient } from './client'

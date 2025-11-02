/**
 * Core Type Definitions for @adi-utils/http
 * type-definitions, contracts, validation
 */

import type { ZodSchema } from 'zod'

/**
 * Route configuration types - discriminated union
 */
export type RouteConfig<TParams = any> =
  | {
      type: 'static'
      path: string
    }
  | {
      type: 'pattern'
      pattern: string
      params: ZodSchema<TParams>
      build?: (params: TParams) => string
    }
  | {
      type: 'custom'
      params: ZodSchema<TParams>
      build: (params: TParams) => string
      parse: (url: URL) => TParams
      is: (url: URL) => boolean
    }

/**
 * Configuration for request body
 * Body IS validated with Zod
 */
export interface BodyConfig<TBody = any> {
  schema: ZodSchema<TBody>
}

/**
 * Configuration for query parameters
 * Query IS validated with Zod
 */
export interface QueryConfig<TQuery = any> {
  schema: ZodSchema<TQuery>
}

/**
 * Configuration for response data
 * Response IS validated with Zod (optional)
 */
export interface ResponseConfig<TResponse = any> {
  schema: ZodSchema<TResponse>
}

/**
 * Complete handler configuration
 * This is the contract shared between client and server
 */
export interface HandlerConfig<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  route: RouteConfig<TParams>
  query?: QueryConfig<TQuery>
  body?: BodyConfig<TBody>
  response?: ResponseConfig<TResponse>
}

/**
 * Context provided to handler functions on the server
 */
export interface HandlerContext<TParams, TQuery, TBody> {
  params: TParams
  query: TQuery
  body: TBody
  headers: Headers
  raw: unknown  // Framework-specific request object
}

/**
 * Handler function type
 */
export type HandlerFunction<TParams, TQuery, TBody, TResponse> = (
  ctx: HandlerContext<TParams, TQuery, TBody>
) => Promise<TResponse> | TResponse

/**
 * Complete handler (config + function)
 * Used on the server side only
 */
export interface Handler<TParams, TQuery, TBody, TResponse> {
  config: HandlerConfig<TParams, TQuery, TBody, TResponse>
  fn: HandlerFunction<TParams, TQuery, TBody, TResponse>
}

/**
 * Client configuration
 */
export interface ClientConfig {
  baseUrl: string
  headers?: Record<string, string>
  fetch?: typeof fetch
}

/**
 * Type helpers for extracting types from configs
 */
export type InferParams<T extends HandlerConfig> =
  T['route'] extends { params: ZodSchema<infer P> } ? P :
  T['route'] extends { type: 'static' } ? never :
  never

export type InferQuery<T extends HandlerConfig> =
  T['query'] extends { schema: ZodSchema<infer Q> } ? Q : never

export type InferBody<T extends HandlerConfig> =
  T['body'] extends { schema: ZodSchema<infer B> } ? B : never

export type InferResponse<T extends HandlerConfig> =
  T['response'] extends { schema: ZodSchema<infer R> } ? R : never

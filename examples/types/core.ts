/**
 * Core Type Definitions for @adi-utils/http
 * type-definitions, contracts, validation
 */

import type { ZodSchema } from 'zod'

/**
 * Configuration for URL parameters
 * Params are NOT validated - only used for URL building
 */
export interface ParamsConfig<TParams = any> {
  schema: ZodSchema<TParams>  // For type inference only
  build: (params: TParams) => string
  pattern: string  // Express route pattern like '/projects/:id'
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
  url?: string  // Static URL (no params)
  params?: ParamsConfig<TParams>  // Dynamic URL with params
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
  T['params'] extends { schema: ZodSchema<infer P> } ? P : never

export type InferQuery<T extends HandlerConfig> =
  T['query'] extends { schema: ZodSchema<infer Q> } ? Q : never

export type InferBody<T extends HandlerConfig> =
  T['body'] extends { schema: ZodSchema<infer B> } ? B : never

export type InferResponse<T extends HandlerConfig> =
  T['response'] extends { schema: ZodSchema<infer R> } ? R : never

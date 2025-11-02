/**
 * Base HTTP Client
 * type-safe-client, validation, fetch
 */

import type { HandlerConfig, ClientConfig } from '../types/core'

/**
 * Type-safe HTTP client that uses handler configs
 *
 * @example
 * ```typescript
 * const client = new BaseClient({
 *   baseUrl: 'http://localhost:3000',
 *   headers: { Authorization: 'Bearer token' }
 * })
 *
 * const project = await client.run(getProjectConfig, {
 *   params: { id: '123' }
 * })
 * ```
 */
export class BaseClient {
  constructor(private config: ClientConfig) {}

  /**
   * Execute a request using a handler config
   *
   * @param handlerConfig - The handler configuration
   * @param options - Request options (params, query, body)
   * @returns The validated response
   */
  async run<TParams, TQuery, TBody, TResponse>(
    handlerConfig: HandlerConfig<TParams, TQuery, TBody, TResponse>,
    options: {
      params?: TParams
      query?: TQuery
      body?: TBody
    }
  ): Promise<TResponse> {
    const { params, query, body } = options

    // Build URL path
    let path: string
    if (handlerConfig.params && params) {
      path = handlerConfig.params.build(params)
    } else if (handlerConfig.url) {
      path = handlerConfig.url
    } else {
      throw new Error('No URL builder found')
    }

    const url = new URL(path, this.config.baseUrl)

    // Add query params
    if (query && handlerConfig.query) {
      // Validate query with Zod
      const validatedQuery = handlerConfig.query.schema.parse(query)
      Object.entries(validatedQuery).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    // Validate body
    let validatedBody = body
    if (body !== undefined && handlerConfig.body) {
      validatedBody = handlerConfig.body.schema.parse(body)
    }

    // Make request
    const fetchFn = this.config.fetch || fetch
    const response = await fetchFn(url.toString(), {
      method: handlerConfig.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: validatedBody !== undefined ? JSON.stringify(validatedBody) : undefined
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    // Validate response
    if (handlerConfig.response) {
      return handlerConfig.response.schema.parse(data)
    }

    return data
  }
}

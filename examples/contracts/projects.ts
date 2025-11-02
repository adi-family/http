/**
 * Project API Contracts
 * api-contracts, shared, type-safe
 *
 * These configs are shared between client and server
 * They define the API contract without implementation details
 */

import { z } from 'zod'
import type { HandlerConfig } from '../types/core'

/**
 * List all projects
 * GET /api/projects?page=1&limit=10
 */
export const listProjectsConfig = {
  method: 'GET',
  url: '/api/projects',
  query: {
    schema: z.object({
      page: z.number().min(1).optional().default(1),
      limit: z.number().min(1).max(100).optional().default(10),
      search: z.string().optional()
    })
  },
  response: {
    schema: z.object({
      data: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        description: z.string().optional(),
        created_at: z.string().datetime()
      })),
      total: z.number(),
      page: z.number(),
      limit: z.number()
    })
  }
} as const satisfies HandlerConfig

/**
 * Get project by ID
 * GET /api/projects/:id
 */
export const getProjectConfig = {
  method: 'GET',
  params: {
    schema: z.object({ id: z.string().uuid() }),
    pattern: '/api/projects/:id',
    build: (params) => `/api/projects/${params.id}`
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime()
    })
  }
} as const satisfies HandlerConfig

/**
 * Create new project
 * POST /api/projects
 */
export const createProjectConfig = {
  method: 'POST',
  url: '/api/projects',
  body: {
    schema: z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(1000).optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
      created_at: z.string().datetime()
    })
  }
} as const satisfies HandlerConfig

/**
 * Update project
 * PATCH /api/projects/:id
 */
export const updateProjectConfig = {
  method: 'PATCH',
  params: {
    schema: z.object({ id: z.string().uuid() }),
    pattern: '/api/projects/:id',
    build: (params) => `/api/projects/${params.id}`
  },
  body: {
    schema: z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(1000).optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
      updated_at: z.string().datetime()
    })
  }
} as const satisfies HandlerConfig

/**
 * Delete project
 * DELETE /api/projects/:id
 */
export const deleteProjectConfig = {
  method: 'DELETE',
  params: {
    schema: z.object({ id: z.string().uuid() }),
    pattern: '/api/projects/:id',
    build: (params) => `/api/projects/${params.id}`
  },
  response: {
    schema: z.object({
      success: z.boolean()
    })
  }
} as const satisfies HandlerConfig

/**
 * Get project tasks
 * GET /api/projects/:projectId/tasks/:taskId
 */
export const getProjectTaskConfig = {
  method: 'GET',
  params: {
    schema: z.object({
      projectId: z.string().uuid(),
      taskId: z.string().uuid()
    }),
    pattern: '/api/projects/:projectId/tasks/:taskId',
    build: (params) => `/api/projects/${params.projectId}/tasks/${params.taskId}`
  },
  query: {
    schema: z.object({
      include: z.enum(['comments', 'assignees', 'history']).optional()
    })
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      projectId: z.string().uuid(),
      title: z.string(),
      description: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
      created_at: z.string().datetime(),
      comments: z.array(z.object({
        id: z.string(),
        text: z.string(),
        created_at: z.string()
      })).optional()
    })
  }
} as const satisfies HandlerConfig

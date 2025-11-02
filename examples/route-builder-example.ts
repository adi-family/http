/**
 * Example demonstrating the new route builder API
 */

import { route, handler } from '../packages/http/src'
import { z } from 'zod'
import type { HandlerConfig } from '../packages/http/src/types'

// ============================================
// 1. Static Route Example
// ============================================

const listUsersConfig = {
  method: 'GET',
  route: route.static('/api/users'),
  query: {
    schema: z.object({
      page: z.number().optional(),
      limit: z.number().optional()
    })
  },
  response: {
    schema: z.array(z.object({
      id: z.string(),
      name: z.string()
    }))
  }
} as const satisfies HandlerConfig

// ============================================
// 2. Dynamic Route Example
// ============================================

const getUserConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/users/:id',
    z.object({ id: z.string() })
  ),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string()
    })
  }
} as const satisfies HandlerConfig

// ============================================
// 3. Multiple Params Example
// ============================================

const getProjectTaskConfig = {
  method: 'GET',
  route: route.dynamic(
    '/api/projects/:projectId/tasks/:taskId',
    z.object({
      projectId: z.string(),
      taskId: z.string()
    })
  ),
  response: {
    schema: z.object({
      id: z.string(),
      projectId: z.string(),
      title: z.string()
    })
  }
} as const satisfies HandlerConfig

// ============================================
// 4. Custom Builder Example
// ============================================

const getUserVersionedConfig = {
  method: 'GET',
  route: route.withBuilder({
    pattern: '/api/v:version/users/:id',
    params: z.object({
      version: z.number(),
      id: z.string()
    }),
    build: (params) => {
      // Custom build logic
      if (params.version === 1) {
        return `/api/legacy/users/${params.id}`
      }
      return `/api/v${params.version}/users/${params.id}`
    }
  }),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string()
    })
  }
} as const satisfies HandlerConfig

// ============================================
// 5. Full Custom Control Example
// ============================================

const getTenantUserConfig = {
  method: 'GET',
  route: route.full({
    params: z.object({
      tenantId: z.string(),
      userId: z.string()
    }),
    build: (params) => {
      return `/api/users/${params.userId}?tenant=${params.tenantId}`
    },
    parse: (url) => {
      const userId = url.pathname.split('/').pop()!
      const tenantId = url.searchParams.get('tenant')!
      return { tenantId, userId }
    },
    is: (url) => {
      return /^\/api\/users\/[^/]+$/.test(url.pathname) &&
             url.searchParams.has('tenant')
    }
  }),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      tenantId: z.string()
    })
  }
} as const satisfies HandlerConfig

// ============================================
// Handlers
// ============================================

const listUsersHandler = handler(listUsersConfig, async (ctx) => {
  console.log('List users:', ctx.query)
  return [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ]
})

const getUserHandler = handler(getUserConfig, async (ctx) => {
  console.log('Get user:', ctx.params.id)
  return {
    id: ctx.params.id,
    name: 'John Doe',
    email: 'john@example.com'
  }
})

const getProjectTaskHandler = handler(getProjectTaskConfig, async (ctx) => {
  console.log('Get task:', ctx.params)
  return {
    id: ctx.params.taskId,
    projectId: ctx.params.projectId,
    title: 'Example Task'
  }
})

const getUserVersionedHandler = handler(getUserVersionedConfig, async (ctx) => {
  console.log('Get user (versioned):', ctx.params)
  return {
    id: ctx.params.id,
    name: `User ${ctx.params.id} (API v${ctx.params.version})`
  }
})

const getTenantUserHandler = handler(getTenantUserConfig, async (ctx) => {
  console.log('Get tenant user:', ctx.params)
  return {
    id: ctx.params.userId,
    name: 'Tenant User',
    tenantId: ctx.params.tenantId
  }
})

console.log('✅ Route builder examples compiled successfully!')
console.log('')
console.log('Examples:')
console.log('  1. Static route:', listUsersConfig.route)
console.log('  2. Dynamic route:', getUserConfig.route)
console.log('  3. Multiple params:', getProjectTaskConfig.route)
console.log('  4. Custom builder:', getUserVersionedConfig.route)
console.log('  5. Full custom:', getTenantUserConfig.route)

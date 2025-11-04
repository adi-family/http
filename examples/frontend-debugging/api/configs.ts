/**
 * API Contract Definitions
 * Shared between client and server
 */

import { z } from 'zod';
import { route } from '@adi-family/http';
import type { HandlerConfig } from '@adi-family/http';

// ============================================================================
// Schemas
// ============================================================================

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['active', 'pending', 'completed']),
  progress: z.number().min(0).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  role: z.enum(['admin', 'user', 'guest']),
});

// ============================================================================
// API Configs
// ============================================================================

export const getProjectsConfig: HandlerConfig<
  never,
  { status?: 'active' | 'pending' | 'completed'; limit?: number },
  never,
  { projects: z.infer<typeof ProjectSchema>[] }
> = {
  method: 'GET',
  route: route.static('/api/projects'),
  query: {
    schema: z.object({
      status: z.enum(['active', 'pending', 'completed']).optional(),
      limit: z.number().optional(),
    }),
  },
  response: {
    schema: z.object({
      projects: z.array(ProjectSchema),
    }),
  },
};

export const getProjectConfig: HandlerConfig<
  { id: string },
  never,
  never,
  z.infer<typeof ProjectSchema>
> = {
  method: 'GET',
  route: route.pattern('/api/projects/:id', z.object({ id: z.string() })),
  response: {
    schema: ProjectSchema,
  },
};

export const createProjectConfig: HandlerConfig<
  never,
  never,
  { name: string; description: string },
  z.infer<typeof ProjectSchema>
> = {
  method: 'POST',
  route: route.static('/api/projects'),
  body: {
    schema: z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(500),
    }),
  },
  response: {
    schema: ProjectSchema,
  },
};

export const updateProjectConfig: HandlerConfig<
  { id: string },
  never,
  { name?: string; description?: string; status?: 'active' | 'pending' | 'completed'; progress?: number },
  z.infer<typeof ProjectSchema>
> = {
  method: 'PUT',
  route: route.pattern('/api/projects/:id', z.object({ id: z.string() })),
  body: {
    schema: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().min(1).max(500).optional(),
      status: z.enum(['active', 'pending', 'completed']).optional(),
      progress: z.number().min(0).max(100).optional(),
    }),
  },
  response: {
    schema: ProjectSchema,
  },
};

export const deleteProjectConfig: HandlerConfig<
  { id: string },
  never,
  never,
  { success: boolean }
> = {
  method: 'DELETE',
  route: route.pattern('/api/projects/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({ success: z.boolean() }),
  },
};

export const getCurrentUserConfig: HandlerConfig<
  never,
  never,
  never,
  z.infer<typeof UserSchema>
> = {
  method: 'GET',
  route: route.static('/api/users/me'),
  response: {
    schema: UserSchema,
  },
};

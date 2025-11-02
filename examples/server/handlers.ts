/**
 * Server-Side Handler Implementations
 * server-handlers, implementation, business-logic
 *
 * These handlers import configs from contracts and add server-side logic
 */

import { handler } from '../types/handler'
import {
  listProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  updateProjectConfig,
  deleteProjectConfig,
  getProjectTaskConfig
} from '../contracts/projects'

// Mock database (replace with real implementation)
const db = {
  projects: new Map<string, any>(),
  tasks: new Map<string, any>()
}

/**
 * List all projects with pagination
 */
export const listProjectsHandler = handler(listProjectsConfig, async (ctx) => {
  const { page, limit, search } = ctx.query

  // Fetch from database
  let projects = Array.from(db.projects.values())

  // Apply search filter
  if (search) {
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Pagination
  const total = projects.length
  const start = (page - 1) * limit
  const end = start + limit
  const data = projects.slice(start, end)

  return {
    data,
    total,
    page,
    limit
  }
})

/**
 * Get single project by ID
 */
export const getProjectHandler = handler(getProjectConfig, async (ctx) => {
  const project = db.projects.get(ctx.params.id)

  if (!project) {
    throw new Error('Project not found')
  }

  return project
})

/**
 * Create new project
 */
export const createProjectHandler = handler(createProjectConfig, async (ctx) => {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const project = {
    id,
    name: ctx.body.name,
    description: ctx.body.description,
    created_at: now,
    updated_at: now
  }

  db.projects.set(id, project)

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    created_at: project.created_at
  }
})

/**
 * Update existing project
 */
export const updateProjectHandler = handler(updateProjectConfig, async (ctx) => {
  const project = db.projects.get(ctx.params.id)

  if (!project) {
    throw new Error('Project not found')
  }

  const updated = {
    ...project,
    name: ctx.body.name ?? project.name,
    description: ctx.body.description ?? project.description,
    updated_at: new Date().toISOString()
  }

  db.projects.set(ctx.params.id, updated)

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    updated_at: updated.updated_at
  }
})

/**
 * Delete project
 */
export const deleteProjectHandler = handler(deleteProjectConfig, async (ctx) => {
  const exists = db.projects.has(ctx.params.id)

  if (!exists) {
    throw new Error('Project not found')
  }

  db.projects.delete(ctx.params.id)

  return { success: true }
})

/**
 * Get project task with optional includes
 */
export const getProjectTaskHandler = handler(getProjectTaskConfig, async (ctx) => {
  const { projectId, taskId } = ctx.params
  const { include } = ctx.query

  // Verify project exists
  if (!db.projects.has(projectId)) {
    throw new Error('Project not found')
  }

  // Get task
  const task = db.tasks.get(taskId)
  if (!task || task.projectId !== projectId) {
    throw new Error('Task not found')
  }

  // Build response
  const response: any = {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    created_at: task.created_at
  }

  // Include comments if requested
  if (include === 'comments') {
    response.comments = [
      { id: '1', text: 'Great task!', created_at: new Date().toISOString() }
    ]
  }

  return response
})

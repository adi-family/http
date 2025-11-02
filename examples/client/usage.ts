/**
 * Client Usage Examples
 * client-usage, type-safe-api-calls
 *
 * Shows how to use the BaseClient with handler configs
 */

import { BaseClient } from './base-client'
import {
  listProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  updateProjectConfig,
  deleteProjectConfig,
  getProjectTaskConfig
} from '../contracts/projects'

// Create client instance
const client = new BaseClient({
  baseUrl: 'http://localhost:3000',
  headers: {
    Authorization: 'Bearer my-auth-token',
    'X-Client-Version': '1.0.0'
  }
})

/**
 * Example 1: List projects with pagination and search
 */
async function listProjects() {
  const response = await client.run(listProjectsConfig, {
    query: {
      page: 1,
      limit: 20,
      search: 'my project'
    }
  })

  console.log(`Found ${response.total} projects`)
  response.data.forEach(project => {
    console.log(`- ${project.name} (${project.id})`)
  })

  return response
}

/**
 * Example 2: Get single project by ID
 */
async function getProject(id: string) {
  const project = await client.run(getProjectConfig, {
    params: { id }
  })

  console.log('Project:', project.name)
  console.log('Description:', project.description || 'No description')

  return project
}

/**
 * Example 3: Create new project
 */
async function createProject(name: string, description?: string) {
  const project = await client.run(createProjectConfig, {
    body: {
      name,
      description
    }
  })

  console.log('Created project:', project.id)

  return project
}

/**
 * Example 4: Update project
 */
async function updateProject(id: string, updates: { name?: string; description?: string }) {
  const project = await client.run(updateProjectConfig, {
    params: { id },
    body: updates
  })

  console.log('Updated project:', project.name)

  return project
}

/**
 * Example 5: Delete project
 */
async function deleteProject(id: string) {
  const result = await client.run(deleteProjectConfig, {
    params: { id }
  })

  console.log('Deleted:', result.success)

  return result
}

/**
 * Example 6: Get project task with includes
 */
async function getProjectTask(projectId: string, taskId: string) {
  const task = await client.run(getProjectTaskConfig, {
    params: { projectId, taskId },
    query: { include: 'comments' }
  })

  console.log('Task:', task.title)
  console.log('Status:', task.status)

  if (task.comments) {
    console.log(`Comments: ${task.comments.length}`)
  }

  return task
}

/**
 * Example 7: Error handling
 */
async function exampleWithErrorHandling() {
  try {
    const project = await client.run(getProjectConfig, {
      params: { id: 'non-existent-id' }
    })
  } catch (error) {
    if (error instanceof Error) {
      console.error('API Error:', error.message)

      // Handle specific error types
      if (error.message.includes('404')) {
        console.error('Project not found')
      } else if (error.message.includes('401')) {
        console.error('Unauthorized')
      }
    }
  }
}

/**
 * Example 8: Workflow - Create, update, and delete
 */
async function projectWorkflow() {
  // Create
  const created = await createProject('New Project', 'A test project')

  // Update
  const updated = await updateProject(created.id, {
    description: 'Updated description'
  })

  // Get
  const fetched = await getProject(updated.id)

  // Delete
  await deleteProject(fetched.id)

  console.log('Workflow completed!')
}

/**
 * Example 9: Batch operations
 */
async function batchOperations() {
  // Create multiple projects in parallel
  const projects = await Promise.all([
    createProject('Project 1', 'First project'),
    createProject('Project 2', 'Second project'),
    createProject('Project 3', 'Third project')
  ])

  console.log(`Created ${projects.length} projects`)

  return projects
}

/**
 * Example 10: Custom client with retry logic
 */
function createRetryClient() {
  return new BaseClient({
    baseUrl: 'http://localhost:3000',
    headers: { Authorization: 'Bearer token' },
    fetch: async (url, options) => {
      let lastError: Error | null = null

      // Retry up to 3 times
      for (let i = 0; i < 3; i++) {
        try {
          const response = await fetch(url, options)

          // Retry on 5xx errors
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status}`)
          }

          return response
        } catch (error) {
          lastError = error as Error
          console.log(`Retry ${i + 1}/3 failed:`, error)

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }

      throw lastError || new Error('Request failed after retries')
    }
  })
}

// Export all examples
export {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectTask,
  exampleWithErrorHandling,
  projectWorkflow,
  batchOperations,
  createRetryClient
}

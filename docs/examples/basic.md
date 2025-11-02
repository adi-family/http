# Basic CRUD Example

This example demonstrates how to build a complete CRUD API for managing projects using @adi-family/http.

## Project Structure

```
my-app/
├── contracts/
│   └── projects.ts       # Shared API contracts
├── server/
│   ├── handlers.ts       # Server-side handlers
│   └── app.ts            # Express server setup
└── client/
    └── usage.ts          # Client usage examples
```

## 1. Define Contracts

First, define your API contracts that will be shared between client and server:

```typescript
// contracts/projects.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

// Shared Zod schemas
const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['active', 'inactive', 'archived']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  status: z.enum(['active', 'inactive']).default('active')
})

const updateProjectSchema = createProjectSchema.partial()

// List projects
export const listProjectsConfig = {
  method: 'GET',
  route: route.static('/api/projects'),
  query: {
    schema: z.object({
      page: z.number().min(1).optional().default(1),
      limit: z.number().min(1).max(100).optional().default(10),
      search: z.string().optional()
    })
  },
  response: {
    schema: z.object({
      data: z.array(projectSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number()
    })
  }
} as const satisfies HandlerConfig

// Get single project
export const getProjectConfig = {
  method: 'GET',
  route: route.dynamic('/api/projects/:id', z.object({ id: z.string() })),
  response: {
    schema: projectSchema
  }
} as const satisfies HandlerConfig

// Create project
export const createProjectConfig = {
  method: 'POST',
  route: route.static('/api/projects'),
  body: {
    schema: createProjectSchema
  },
  response: {
    schema: projectSchema
  }
} as const satisfies HandlerConfig

// Update project
export const updateProjectConfig = {
  method: 'PUT',
  route: route.dynamic('/api/projects/:id', z.object({ id: z.string() })),
  body: {
    schema: updateProjectSchema
  },
  response: {
    schema: projectSchema
  }
} as const satisfies HandlerConfig

// Delete project
export const deleteProjectConfig = {
  method: 'DELETE',
  route: route.dynamic('/api/projects/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      success: z.boolean()
    })
  }
} as const satisfies HandlerConfig
```

## 2. Implement Server Handlers

Create handlers that implement the business logic:

```typescript
// server/handlers.ts
import { handler } from '@adi-family/http'
import {
  listProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  updateProjectConfig,
  deleteProjectConfig
} from '../contracts/projects'

// In-memory database for this example
const db = {
  projects: new Map<string, any>()
}

// Seed with sample data
db.projects.set('1', {
  id: '1',
  name: 'Website Redesign',
  description: 'Complete overhaul of company website',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

db.projects.set('2', {
  id: '2',
  name: 'Mobile App',
  description: 'iOS and Android mobile application',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

// List projects handler
export const listProjectsHandler = handler(listProjectsConfig, async (ctx) => {
  const { page, limit, search } = ctx.query

  let projects = Array.from(db.projects.values())

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase()
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    )
  }

  // Apply pagination
  const start = (page - 1) * limit
  const end = start + limit
  const paginatedProjects = projects.slice(start, end)

  return {
    data: paginatedProjects,
    total: projects.length,
    page,
    limit
  }
})

// Get project handler
export const getProjectHandler = handler(getProjectConfig, async (ctx) => {
  const project = db.projects.get(ctx.params.id)

  if (!project) {
    throw new Error('Project not found')
  }

  return project
})

// Create project handler
export const createProjectHandler = handler(createProjectConfig, async (ctx) => {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const project = {
    id,
    ...ctx.body,
    created_at: now,
    updated_at: now
  }

  db.projects.set(id, project)

  return project
})

// Update project handler
export const updateProjectHandler = handler(updateProjectConfig, async (ctx) => {
  const project = db.projects.get(ctx.params.id)

  if (!project) {
    throw new Error('Project not found')
  }

  const updatedProject = {
    ...project,
    ...ctx.body,
    updated_at: new Date().toISOString()
  }

  db.projects.set(ctx.params.id, updatedProject)

  return updatedProject
})

// Delete project handler
export const deleteProjectHandler = handler(deleteProjectConfig, async (ctx) => {
  if (!db.projects.has(ctx.params.id)) {
    throw new Error('Project not found')
  }

  db.projects.delete(ctx.params.id)

  return { success: true }
})
```

## 3. Set Up Express Server

Create an Express server and register the handlers:

```typescript
// server/app.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import {
  listProjectsHandler,
  getProjectHandler,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler
} from './handlers'

const app = express()

// Middleware
app.use(express.json())

// Enable CORS for client-side requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Register handlers
serveExpress(app, [
  listProjectsHandler,
  getProjectHandler,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler
])

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)

  if (err.message === 'Project not found') {
    return res.status(404).json({ error: err.message })
  }

  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

## 4. Use the Client

Create a client to interact with your API:

```typescript
// client/usage.ts
import { BaseClient } from '@adi-family/http'
import {
  listProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  updateProjectConfig,
  deleteProjectConfig
} from '../contracts/projects'

// Create client instance
const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

async function main() {
  try {
    // List projects
    console.log('Listing projects...')
    const projects = await client.run(listProjectsConfig, {
      query: { page: 1, limit: 10 }
    })
    console.log(`Found ${projects.total} projects:`)
    projects.data.forEach(p => {
      console.log(`- ${p.name}: ${p.description}`)
    })

    // Search projects
    console.log('\nSearching for "mobile"...')
    const searchResults = await client.run(listProjectsConfig, {
      query: { search: 'mobile' }
    })
    console.log(`Found ${searchResults.total} matching projects`)

    // Get single project
    console.log('\nGetting project 1...')
    const project = await client.run(getProjectConfig, {
      params: { id: '1' }
    })
    console.log(`Project: ${project.name}`)
    console.log(`Status: ${project.status}`)

    // Create new project
    console.log('\nCreating new project...')
    const newProject = await client.run(createProjectConfig, {
      body: {
        name: 'API Documentation',
        description: 'Write comprehensive API documentation',
        status: 'active'
      }
    })
    console.log(`Created project with ID: ${newProject.id}`)

    // Update project
    console.log('\nUpdating project...')
    const updatedProject = await client.run(updateProjectConfig, {
      params: { id: newProject.id },
      body: {
        status: 'inactive'
      }
    })
    console.log(`Updated project status: ${updatedProject.status}`)

    // Delete project
    console.log('\nDeleting project...')
    const result = await client.run(deleteProjectConfig, {
      params: { id: newProject.id }
    })
    console.log(`Deletion successful: ${result.success}`)

  } catch (error) {
    console.error('Error:', error)
  }
}

main()
```

## 5. Run the Application

### Start the server

```bash
# Install dependencies
npm install @adi-family/http @adi-family/http-express zod express
npm install -D @types/express

# Run the server
npx tsx server/app.ts
```

### Run the client

```bash
# In a separate terminal
npx tsx client/usage.ts
```

## Expected Output

### Server Output

```
Server running on http://localhost:3000
```

### Client Output

```
Listing projects...
Found 2 projects:
- Website Redesign: Complete overhaul of company website
- Mobile App: iOS and Android mobile application

Searching for "mobile"...
Found 1 matching projects

Getting project 1...
Project: Website Redesign
Status: active

Creating new project...
Created project with ID: a7b8c9d0-e1f2-3456-7890-abcdef123456

Updating project...
Updated project status: inactive

Deleting project...
Deletion successful: true
```

## Key Takeaways

### Type Safety

Notice how TypeScript infers all types automatically:

```typescript
const project = await client.run(getProjectConfig, {
  params: { id: '1' }
})

// TypeScript knows:
project.id          // string
project.name        // string
project.status      // 'active' | 'inactive' | 'archived'
project.created_at  // string
```

### Validation

All data is validated automatically:

```typescript
// ❌ This will fail validation
await client.run(createProjectConfig, {
  body: {
    name: '',  // Too short
    description: 'x'.repeat(2000),  // Too long
    status: 'invalid'  // Not in enum
  }
})
```

### DRY Principle

The route is defined once and used everywhere:

```typescript
// Contract defines the route
route: route.dynamic('/api/projects/:id', z.object({ id: z.string() }))

// Server automatically registers it
serveExpress(app, [getProjectHandler])

// Client automatically builds URLs
client.run(getProjectConfig, { params: { id: '1' } })
// Calls: GET /api/projects/1
```

## Next Steps

- [Advanced Examples](/examples/advanced) - More complex patterns
- [Authentication](/examples/auth) - Add auth to your API
- [File Upload](/examples/file-upload) - Handle file uploads
- [Migration from Hono](/examples/migration) - Migrate existing APIs

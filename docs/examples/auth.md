# Authentication Example

This guide demonstrates how to add authentication to your @adi-family/http API using JWT tokens, including protected routes, user login, and middleware patterns.

## Overview

We'll implement:
- User registration and login
- JWT token generation and validation
- Protected routes requiring authentication
- Authorization based on user roles
- Client-side token management

## 1. Setup Dependencies

```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

## 2. Auth Contracts

Define authentication-related API contracts:

```typescript
// contracts/auth.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

// Register new user
export const registerConfig = {
  method: 'POST',
  route: route.static('/api/auth/register'),
  body: {
    schema: z.object({
      email: z.string().email(),
      password: z.string().min(8).max(100),
      name: z.string().min(1).max(255)
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      token: z.string()
    })
  }
} as const satisfies HandlerConfig

// Login
export const loginConfig = {
  method: 'POST',
  route: route.static('/api/auth/login'),
  body: {
    schema: z.object({
      email: z.string().email(),
      password: z.string()
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      token: z.string()
    })
  }
} as const satisfies HandlerConfig

// Get current user (protected)
export const getMeConfig = {
  method: 'GET',
  route: route.static('/api/auth/me'),
  response: {
    schema: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.enum(['admin', 'user'])
    })
  }
} as const satisfies HandlerConfig

// Refresh token
export const refreshTokenConfig = {
  method: 'POST',
  route: route.static('/api/auth/refresh'),
  response: {
    schema: z.object({
      token: z.string()
    })
  }
} as const satisfies HandlerConfig
```

## 3. Protected Resource Contracts

```typescript
// contracts/projects.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

// Get user's projects (protected)
export const getMyProjectsConfig = {
  method: 'GET',
  route: route.static('/api/projects'),
  query: {
    schema: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10)
    })
  },
  response: {
    schema: z.object({
      data: z.array(z.object({
        id: z.string(),
        name: z.string(),
        ownerId: z.string()
      })),
      total: z.number()
    })
  }
} as const satisfies HandlerConfig

// Create project (protected)
export const createProjectConfig = {
  method: 'POST',
  route: route.static('/api/projects'),
  body: {
    schema: z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(1000)
    })
  },
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      ownerId: z.string()
    })
  }
} as const satisfies HandlerConfig

// Delete project (protected, owner only)
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

## 4. Auth Utilities

Create helper functions for authentication:

```typescript
// server/auth/utils.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '24h'

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer (.+)$/)
  return match ? match[1] : null
}
```

## 5. Auth Handlers

Implement authentication handlers:

```typescript
// server/handlers/auth.ts
import { handler } from '@adi-family/http'
import {
  registerConfig,
  loginConfig,
  getMeConfig,
  refreshTokenConfig
} from '../../contracts/auth'
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractBearerToken
} from '../auth/utils'

// In-memory database for this example
const db = {
  users: new Map<string, {
    id: string
    email: string
    name: string
    password: string
    role: 'admin' | 'user'
  }>()
}

// Register handler
export const registerHandler = handler(registerConfig, async (ctx) => {
  const { email, password, name } = ctx.body

  // Check if user already exists
  const existing = Array.from(db.users.values()).find(u => u.email === email)
  if (existing) {
    throw new Error('Email already registered')
  }

  // Create user
  const id = crypto.randomUUID()
  const hashedPassword = await hashPassword(password)

  const user = {
    id,
    email,
    name,
    password: hashedPassword,
    role: 'user' as const
  }

  db.users.set(id, user)

  // Generate token
  const token = generateToken({
    userId: id,
    email: user.email,
    role: user.role
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token
  }
})

// Login handler
export const loginHandler = handler(loginConfig, async (ctx) => {
  const { email, password } = ctx.body

  // Find user
  const user = Array.from(db.users.values()).find(u => u.email === email)
  if (!user) {
    throw new Error('Invalid credentials')
  }

  // Verify password
  const isValid = await comparePassword(password, user.password)
  if (!isValid) {
    throw new Error('Invalid credentials')
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token
  }
})

// Get current user handler (protected)
export const getMeHandler = handler(getMeConfig, async (ctx) => {
  // Extract token from Authorization header
  const token = extractBearerToken(ctx.headers.get('authorization'))
  if (!token) {
    throw new Error('Unauthorized')
  }

  // Verify token
  const payload = verifyToken(token)

  // Get user
  const user = db.users.get(payload.userId)
  if (!user) {
    throw new Error('User not found')
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  }
})

// Refresh token handler
export const refreshTokenHandler = handler(refreshTokenConfig, async (ctx) => {
  const token = extractBearerToken(ctx.headers.get('authorization'))
  if (!token) {
    throw new Error('Unauthorized')
  }

  // Verify old token
  const payload = verifyToken(token)

  // Generate new token
  const newToken = generateToken({
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  })

  return { token: newToken }
})
```

## 6. Protected Resource Handlers

```typescript
// server/handlers/projects.ts
import { handler } from '@adi-family/http'
import {
  getMyProjectsConfig,
  createProjectConfig,
  deleteProjectConfig
} from '../../contracts/projects'
import { verifyToken, extractBearerToken } from '../auth/utils'

const db = {
  projects: new Map<string, {
    id: string
    name: string
    description: string
    ownerId: string
  }>()
}

// Helper to get authenticated user
function getAuthenticatedUser(authHeader: string | null) {
  const token = extractBearerToken(authHeader)
  if (!token) {
    throw new Error('Unauthorized')
  }
  return verifyToken(token)
}

// Get user's projects
export const getMyProjectsHandler = handler(getMyProjectsConfig, async (ctx) => {
  const user = getAuthenticatedUser(ctx.headers.get('authorization'))

  const userProjects = Array.from(db.projects.values())
    .filter(p => p.ownerId === user.userId)

  const { page, limit } = ctx.query
  const start = (page - 1) * limit
  const end = start + limit

  return {
    data: userProjects.slice(start, end),
    total: userProjects.length
  }
})

// Create project
export const createProjectHandler = handler(createProjectConfig, async (ctx) => {
  const user = getAuthenticatedUser(ctx.headers.get('authorization'))

  const id = crypto.randomUUID()
  const project = {
    id,
    ...ctx.body,
    ownerId: user.userId
  }

  db.projects.set(id, project)

  return project
})

// Delete project (owner only)
export const deleteProjectHandler = handler(deleteProjectConfig, async (ctx) => {
  const user = getAuthenticatedUser(ctx.headers.get('authorization'))

  const project = db.projects.get(ctx.params.id)
  if (!project) {
    throw new Error('Project not found')
  }

  // Check ownership
  if (project.ownerId !== user.userId && user.role !== 'admin') {
    throw new Error('Forbidden: You do not own this project')
  }

  db.projects.delete(ctx.params.id)

  return { success: true }
})
```

## 7. Express Server Setup

```typescript
// server/app.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import {
  registerHandler,
  loginHandler,
  getMeHandler,
  refreshTokenHandler
} from './handlers/auth'
import {
  getMyProjectsHandler,
  createProjectHandler,
  deleteProjectHandler
} from './handlers/projects'

const app = express()
app.use(express.json())

// Register all handlers
serveExpress(app, [
  // Auth routes
  registerHandler,
  loginHandler,
  getMeHandler,
  refreshTokenHandler,

  // Protected routes
  getMyProjectsHandler,
  createProjectHandler,
  deleteProjectHandler
])

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)

  if (err.message === 'Unauthorized') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (err.message === 'Forbidden: You do not own this project') {
    return res.status(403).json({ error: err.message })
  }

  if (err.message === 'Invalid credentials' || err.message === 'Email already registered') {
    return res.status(400).json({ error: err.message })
  }

  res.status(500).json({ error: 'Internal server error' })
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## 8. Client Usage

### Authentication Flow

```typescript
// client/auth-client.ts
import { BaseClient } from '@adi-family/http'
import {
  registerConfig,
  loginConfig,
  getMeConfig
} from '../contracts/auth'
import {
  getMyProjectsConfig,
  createProjectConfig,
  deleteProjectConfig
} from '../contracts/projects'

class AuthenticatedClient {
  private client: BaseClient
  private token: string | null = null

  constructor(baseUrl: string) {
    this.client = new BaseClient({ baseUrl })
  }

  // Register new user
  async register(email: string, password: string, name: string) {
    const result = await this.client.run(registerConfig, {
      body: { email, password, name }
    })
    this.token = result.token
    return result
  }

  // Login
  async login(email: string, password: string) {
    const result = await this.client.run(loginConfig, {
      body: { email, password }
    })
    this.token = result.token
    return result
  }

  // Get current user
  async getMe() {
    if (!this.token) throw new Error('Not authenticated')

    return this.client.run(getMeConfig, {
      headers: { Authorization: `Bearer ${this.token}` }
    })
  }

  // Get user's projects
  async getProjects(page = 1, limit = 10) {
    if (!this.token) throw new Error('Not authenticated')

    return this.client.run(getMyProjectsConfig, {
      query: { page, limit },
      headers: { Authorization: `Bearer ${this.token}` }
    })
  }

  // Create project
  async createProject(name: string, description: string) {
    if (!this.token) throw new Error('Not authenticated')

    return this.client.run(createProjectConfig, {
      body: { name, description },
      headers: { Authorization: `Bearer ${this.token}` }
    })
  }

  // Delete project
  async deleteProject(id: string) {
    if (!this.token) throw new Error('Not authenticated')

    return this.client.run(deleteProjectConfig, {
      params: { id },
      headers: { Authorization: `Bearer ${this.token}` }
    })
  }

  // Logout
  logout() {
    this.token = null
  }
}

// Usage
async function main() {
  const client = new AuthenticatedClient('http://localhost:3000')

  // Register
  console.log('Registering user...')
  const user = await client.register(
    'john@example.com',
    'password123',
    'John Doe'
  )
  console.log('Registered:', user)

  // Get current user
  const me = await client.getMe()
  console.log('Current user:', me)

  // Create project
  const project = await client.createProject(
    'My Project',
    'A test project'
  )
  console.log('Created project:', project)

  // Get projects
  const projects = await client.getProjects()
  console.log('Projects:', projects)

  // Delete project
  await client.deleteProject(project.id)
  console.log('Project deleted')

  // Logout
  client.logout()
}

main()
```

### Token Persistence

```typescript
// client/persistent-auth-client.ts
class PersistentAuthClient extends AuthenticatedClient {
  constructor(baseUrl: string) {
    super(baseUrl)
    // Load token from storage on initialization
    this.token = localStorage.getItem('auth_token')
  }

  async login(email: string, password: string) {
    const result = await super.login(email, password)
    // Save token to storage
    localStorage.setItem('auth_token', result.token)
    return result
  }

  logout() {
    super.logout()
    localStorage.removeItem('auth_token')
  }
}
```

## Best Practices

### 1. Use Environment Variables for Secrets

```typescript
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set')
}
```

### 2. Implement Token Refresh

```typescript
async refreshToken() {
  if (!this.token) throw new Error('Not authenticated')

  const result = await this.client.run(refreshTokenConfig, {
    headers: { Authorization: `Bearer ${this.token}` }
  })
  this.token = result.token
  localStorage.setItem('auth_token', result.token)
}
```

### 3. Handle 401 Errors Globally

```typescript
async function apiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      // Redirect to login
      window.location.href = '/login'
    }
    throw error
  }
}
```

### 4. Use HTTPS in Production

Never send tokens over HTTP in production.

## Next Steps

- [Basic Examples](/examples/basic) - CRUD operations
- [Advanced Examples](/examples/advanced) - Complex patterns
- [File Upload](/examples/file-upload) - Handle file uploads

# Project Structure

project-structure, organization, architecture

Recommended directory structure for projects using @adi-utils/http

## Full Structure

```
your-project/
├── packages/
│   ├── api-contracts/              # Shared API contracts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── index.ts               # Export all configs
│   │   ├── users.ts               # User API configs
│   │   ├── projects.ts            # Project API configs
│   │   └── tasks.ts               # Task API configs
│   │
│   ├── backend/                    # Server implementation
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── index.ts               # Express app entry
│   │   ├── handlers/
│   │   │   ├── users.ts           # User handlers (imports configs)
│   │   │   ├── projects.ts        # Project handlers
│   │   │   └── tasks.ts           # Task handlers
│   │   ├── middleware/
│   │   │   ├── auth.ts            # Authentication middleware
│   │   │   └── error.ts           # Error handling
│   │   ├── services/
│   │   │   └── db.ts              # Database access
│   │   └── config.ts              # Server configuration
│   │
│   ├── client/                     # Client application
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── index.ts               # Client entry
│   │   ├── api/
│   │   │   ├── client.ts          # BaseClient instance
│   │   │   ├── users.ts           # User API calls
│   │   │   ├── projects.ts        # Project API calls
│   │   │   └── tasks.ts           # Task API calls
│   │   └── components/
│   │       └── ...                # UI components
│   │
│   └── utils/                      # Shared utilities
│       ├── http/                   # Core HTTP library
│       │   ├── package.json
│       │   ├── types.ts           # Core types
│       │   ├── handler.ts         # Handler factory
│       │   └── client.ts          # BaseClient
│       └── http-express/           # Express adapter
│           ├── package.json
│           └── serve.ts           # Express integration
│
├── package.json                    # Root package.json (workspaces)
└── tsconfig.json                   # Root TypeScript config
```

## Package Dependencies

### @api-contracts

```json
{
  "name": "@api-contracts",
  "dependencies": {
    "@adi-utils/http": "workspace:*",
    "zod": "^3.22.4"
  }
}
```

### @backend

```json
{
  "name": "@backend",
  "dependencies": {
    "@api-contracts": "workspace:*",
    "@adi-utils/http": "workspace:*",
    "@adi-utils/http-express": "workspace:*",
    "express": "^4.18.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

### @client

```json
{
  "name": "@client",
  "dependencies": {
    "@api-contracts": "workspace:*",
    "@adi-utils/http": "workspace:*",
    "zod": "^3.22.4"
  }
}
```

## File Organization Patterns

### 1. API Contracts (One per domain)

```typescript
// packages/api-contracts/users.ts
export const listUsersConfig = { /* ... */ }
export const getUserConfig = { /* ... */ }
export const createUserConfig = { /* ... */ }
export const updateUserConfig = { /* ... */ }
export const deleteUserConfig = { /* ... */ }
```

### 2. Backend Handlers (Matches contracts)

```typescript
// packages/backend/handlers/users.ts
import * as configs from '@api-contracts/users'

export const listUsersHandler = handler(configs.listUsersConfig, async (ctx) => {
  // Implementation
})

export const getUserHandler = handler(configs.getUserConfig, async (ctx) => {
  // Implementation
})
// ... more handlers
```

### 3. Client API Layer (Grouped by feature)

```typescript
// packages/client/api/users.ts
import { client } from './client'
import * as configs from '@api-contracts/users'

export const userApi = {
  list: (query) => client.run(configs.listUsersConfig, { query }),
  get: (id) => client.run(configs.getUserConfig, { params: { id } }),
  create: (data) => client.run(configs.createUserConfig, { body: data }),
  update: (id, data) => client.run(configs.updateUserConfig, { params: { id }, body: data }),
  delete: (id) => client.run(configs.deleteUserConfig, { params: { id } })
}
```

## Alternative Structures

### Monorepo with Shared Packages

```
monorepo/
├── apps/
│   ├── api/                    # Backend application
│   └── web/                    # Frontend application
├── packages/
│   ├── api-contracts/          # Shared contracts
│   ├── http/                   # Core HTTP library
│   └── http-express/           # Express adapter
└── package.json
```

### Separate Repositories

```
backend-repo/
├── src/
│   ├── handlers/
│   └── index.ts
└── package.json               # Depends on @api-contracts via npm

frontend-repo/
├── src/
│   ├── api/
│   └── index.ts
└── package.json               # Depends on @api-contracts via npm

contracts-repo/
├── src/
│   ├── users.ts
│   ├── projects.ts
│   └── index.ts
└── package.json               # Published to npm
```

## Naming Conventions

### Configs

- `list{Resource}Config` - List resources (GET)
- `get{Resource}Config` - Get single resource (GET)
- `create{Resource}Config` - Create resource (POST)
- `update{Resource}Config` - Update resource (PATCH)
- `delete{Resource}Config` - Delete resource (DELETE)

### Handlers

- `list{Resource}Handler` - Matches config name
- `get{Resource}Handler`
- `create{Resource}Handler`
- `update{Resource}Handler`
- `delete{Resource}Handler`

### Files

- `{domain}.ts` - Group by domain (users.ts, projects.ts)
- Singular for single resource operations
- Plural for resource name (users, projects, not user, project)

## Best Practices

1. **Collocate related configs** - Keep all user configs in users.ts
2. **Mirror structure** - Backend handlers should mirror contract files
3. **Single client instance** - Create one BaseClient, reuse everywhere
4. **Wrap client calls** - Create API objects for better organization
5. **Share types** - Export types from contracts when needed
6. **Keep contracts minimal** - Only what's needed for API contract
7. **Separate concerns** - Business logic in handlers, not configs

## Example Index Files

### API Contracts Index

```typescript
// packages/api-contracts/index.ts
export * from './users'
export * from './projects'
export * from './tasks'
```

### Backend Handlers Index

```typescript
// packages/backend/handlers/index.ts
export * from './users'
export * from './projects'
export * from './tasks'
```

### Client API Index

```typescript
// packages/client/api/index.ts
export { userApi } from './users'
export { projectApi } from './projects'
export { taskApi } from './tasks'
```

## TypeScript Configuration

### Root tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@api-contracts/*": ["./packages/api-contracts/*"],
      "@backend/*": ["./packages/backend/*"],
      "@client/*": ["./packages/client/*"],
      "@adi-utils/*": ["./packages/utils/*"]
    }
  }
}
```

This structure ensures:
- Clear separation of concerns
- Easy to navigate and understand
- Type safety across packages
- Scalable as project grows

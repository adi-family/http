# @adi-family/http

Framework-agnostic, type-safe HTTP interface system that separates API contracts from implementation, enabling end-to-end type safety between client and server.

## Installation

```bash
npm install @adi-family/http zod
# or
bun add @adi-family/http zod
```

## Quick Start

### 1. Define API Contract

```typescript
import { z } from 'zod'
import { route } from '@adi-family/http'
import type { HandlerConfig } from '@adi-family/http'

export const getUserConfig = {
  method: 'GET',
  route: route.pattern('/api/users/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email()
    })
  }
} as const satisfies HandlerConfig
```

### 2. Create Server Handler

```typescript
import { handler } from '@adi-family/http'
import { getUserConfig } from './contracts'

export const getUserHandler = handler(getUserConfig, async (ctx) => {
  const user = await db.users.findById(ctx.params.id)
  return user
})
```

### 3. Use in Client

```typescript
import { BaseClient } from '@adi-family/http'
import { getUserConfig } from './contracts'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

// Fully type-safe!
const user = await client.run(getUserConfig, {
  params: { id: '123' }
})
```

## Features

- **Framework Agnostic** - Works with Express, Hono, Fastify, or any HTTP framework
- **Type Safety** - Full TypeScript inference from config to client
- **Config-Based Contracts** - API definitions are pure configuration objects
- **Validation** - Body and query validated with Zod schemas
- **No Param Validation** - URL params used only for building paths
- **Separation of Concerns** - Contracts live separately from server handlers

## Documentation

For complete documentation, examples, and guides, visit:
https://github.com/adi-family/http

## Framework Adapters

- [@adi-family/http-express](https://www.npmjs.com/package/@adi-family/http-express) - Express adapter

## License

MIT - See LICENSE file for details

Copyright (c) 2025 ADI Family (https://github.com/adi-family)

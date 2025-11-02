# @adi-family/http-express

Express adapter for [@adi-family/http](https://www.npmjs.com/package/@adi-family/http) - converts type-safe handlers into Express routes.

## Installation

```bash
npm install @adi-family/http @adi-family/http-express express zod
# or
bun add @adi-family/http @adi-family/http-express express zod
```

## Quick Start

```typescript
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { getUserHandler, createUserHandler } from './handlers'

const app = express()
app.use(express.json())

serveExpress(app, [
  getUserHandler,
  createUserHandler
])

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## Features

- **Automatic Route Registration** - Maps handlers to Express routes
- **Built-in Validation** - Validates query and body with Zod
- **Error Handling** - Handles validation errors automatically
- **Type Safety** - Full TypeScript support

## Usage Example

### 1. Define Contract

```typescript
import { z } from 'zod'
import { route } from '@adi-family/http'
import type { HandlerConfig } from '@adi-family/http'

export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string(),
      email: z.string().email()
    })
  },
  response: {
    schema: z.object({ id: z.string() })
  }
} as const satisfies HandlerConfig
```

### 2. Create Handler

```typescript
import { handler } from '@adi-family/http'
import { createUserConfig } from './contracts'

export const createUserHandler = handler(createUserConfig, async (ctx) => {
  const user = await db.users.create(ctx.body)
  return { id: user.id }
})
```

### 3. Serve with Express

```typescript
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { createUserHandler } from './handlers'

const app = express()
app.use(express.json())

serveExpress(app, [createUserHandler])

app.listen(3000)
```

## Documentation

For complete documentation and examples, visit:
https://github.com/adi-family/http

## License

MIT - See LICENSE file for details

Copyright (c) 2025 ADI Family (https://github.com/adi-family)

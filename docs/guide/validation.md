# Validation

@adi-family/http uses [Zod](https://zod.dev) for runtime validation of query parameters, request bodies, and responses. This ensures type safety and data integrity across your entire API.

## Overview

Validation happens automatically on both client and server:

```typescript
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

export const createUserConfig = {
  method: 'POST',
  route: route.static('/api/users'),
  body: {
    schema: z.object({
      name: z.string().min(1).max(255),
      email: z.string().email()
    })
  },
  response: {
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string()
    })
  }
} as const satisfies HandlerConfig
```

## What Gets Validated

### URL Parameters (NOT Validated)

URL parameters are **not validated at runtime** - they're only used for type inference and URL building:

```typescript
// Params are used for TypeScript types and URL building only
route: route.dynamic(
  '/api/users/:id',
  z.object({ id: z.string() }) // Used for types, NOT validation
)
```

**Why?** URL parameters come from the route pattern itself and are extracted by the router. The Zod schema is only needed for TypeScript to infer the shape.

### Query Parameters (Validated)

Query parameters are validated on both client and server:

```typescript
query: {
  schema: z.object({
    page: z.number().min(1).optional().default(1),
    limit: z.number().min(1).max(100).optional().default(10),
    search: z.string().optional()
  })
}
```

### Request Body (Validated)

Request bodies are validated on both client and server:

```typescript
body: {
  schema: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    age: z.number().min(18).optional()
  })
}
```

### Response (Validated)

Responses are validated before being sent (server) or received (client):

```typescript
response: {
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    created_at: z.string().datetime()
  })
}
```

## Validation Flow

### Client-Side

1. **Query validation** - Before adding to URL
2. **Body validation** - Before sending request
3. **Response validation** - After receiving response (if schema provided)

```typescript
const client = new BaseClient({ baseUrl: 'http://localhost:3000' })

// These will be validated before the request is sent:
await client.run(createUserConfig, {
  body: {
    name: 'John',
    email: 'invalid-email' // ❌ Validation error thrown here
  }
})
```

### Server-Side

1. **Query parsing** - Parse from URL and validate
2. **Body parsing** - Parse from request and validate
3. **Response validation** - Validate before sending (if schema provided)

```typescript
export const createUserHandler = handler(createUserConfig, async (ctx) => {
  // ctx.query and ctx.body are already validated
  const { name, email } = ctx.body

  const user = await db.users.create({ name, email })

  // Response will be validated before sending
  return user
})
```

## Common Validation Patterns

### Required vs Optional

```typescript
z.object({
  name: z.string(),              // Required
  email: z.string().optional(),  // Optional (can be undefined)
  age: z.number().nullable()     // Nullable (can be null)
})
```

### Default Values

```typescript
query: {
  schema: z.object({
    page: z.number().default(1),
    limit: z.number().default(10)
  })
}

// If not provided, page and limit will be set to defaults
```

### String Validation

```typescript
z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  email: z.string().email('Invalid email address'),

  url: z.string().url('Invalid URL'),

  uuid: z.string().uuid('Invalid UUID')
})
```

### Number Validation

```typescript
z.object({
  age: z.number()
    .int('Age must be an integer')
    .min(18, 'Must be at least 18')
    .max(120, 'Must be at most 120'),

  price: z.number()
    .positive('Price must be positive')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),

  rating: z.number().min(1).max(5)
})
```

### Array Validation

```typescript
z.object({
  tags: z.array(z.string())
    .min(1, 'At least one tag is required')
    .max(5, 'Maximum 5 tags allowed'),

  roles: z.array(z.enum(['admin', 'user', 'guest']))
    .nonempty('At least one role is required')
})
```

### Enum Validation

```typescript
z.object({
  status: z.enum(['active', 'inactive', 'pending']),

  role: z.enum(['admin', 'user', 'guest'])
})
```

### Date Validation

```typescript
z.object({
  // ISO datetime string
  created_at: z.string().datetime(),

  // Date object
  birthdate: z.date()
    .min(new Date('1900-01-01'))
    .max(new Date()),

  // Custom date validation
  appointment: z.string().refine(
    (val) => new Date(val) > new Date(),
    'Appointment must be in the future'
  )
})
```

### Nested Objects

```typescript
z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string().regex(/^\d{5}$/)
    })
  })
})
```

### Discriminated Unions

```typescript
z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    email: z.string().email()
  }),
  z.object({
    type: z.literal('phone'),
    phone: z.string().regex(/^\d{10}$/)
  })
])
```

## Custom Validation

### Using .refine()

```typescript
z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (val) => /[A-Z]/.test(val),
      'Password must contain at least one uppercase letter'
    )
    .refine(
      (val) => /[a-z]/.test(val),
      'Password must contain at least one lowercase letter'
    )
    .refine(
      (val) => /[0-9]/.test(val),
      'Password must contain at least one number'
    )
})
```

### Cross-Field Validation

```typescript
z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
)
```

### Async Validation

For async validation (like checking if email exists), do it in the handler, not in Zod:

```typescript
export const createUserHandler = handler(createUserConfig, async (ctx) => {
  const { email } = ctx.body

  // Zod has already validated the email format
  // Now check business rules
  const existing = await db.users.findByEmail(email)
  if (existing) {
    throw new Error('Email already in use')
  }

  return await db.users.create(ctx.body)
})
```

## Validation Errors

### Error Format

When validation fails, the server returns HTTP 400 with error details:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email"
    },
    {
      "path": ["age"],
      "message": "Number must be greater than or equal to 18"
    }
  ]
}
```

### Client-Side Error Handling

```typescript
try {
  await client.run(createUserConfig, {
    body: {
      name: '',
      email: 'not-an-email'
    }
  })
} catch (error) {
  if (error instanceof Error) {
    console.error('Validation failed:', error.message)
  }
}
```

### Server-Side Error Handling

Validation errors are automatically caught by the adapter:

```typescript
// packages/http-express/src/index.ts
if (error.name === 'ZodError') {
  res.status(400).json({
    error: 'Validation failed',
    details: error.errors
  })
}
```

## Type Inference

Zod schemas provide TypeScript types automatically:

```typescript
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional()
})

type User = z.infer<typeof userSchema>
// {
//   name: string
//   email: string
//   age?: number
// }
```

Handler configs use this for automatic type inference:

```typescript
export const createUserConfig = {
  body: { schema: userSchema },
  response: { schema: userSchema }
} as const satisfies HandlerConfig

// In handler:
handler(createUserConfig, async (ctx) => {
  ctx.body.name   // ✅ string
  ctx.body.email  // ✅ string
  ctx.body.age    // ✅ number | undefined
})
```

## Advanced Patterns

### Reusable Schemas

```typescript
// schemas/user.ts
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email()
})

export const createUserSchema = userSchema.omit({ id: true })
export const updateUserSchema = userSchema.partial().omit({ id: true })

// contracts/users.ts
import { userSchema, createUserSchema, updateUserSchema } from '../schemas/user'

export const getUserConfig = {
  response: { schema: userSchema }
} as const satisfies HandlerConfig

export const createUserConfig = {
  body: { schema: createUserSchema },
  response: { schema: userSchema }
} as const satisfies HandlerConfig

export const updateUserConfig = {
  body: { schema: updateUserSchema },
  response: { schema: userSchema }
} as const satisfies HandlerConfig
```

### Transform Data

```typescript
query: {
  schema: z.object({
    tags: z.string().transform((val) => val.split(','))
  })
}

// Query: ?tags=javascript,typescript,react
// Parsed: { tags: ['javascript', 'typescript', 'react'] }
```

### Coercion

```typescript
query: {
  schema: z.object({
    page: z.coerce.number().min(1).default(1),
    enabled: z.coerce.boolean()
  })
}

// Query: ?page=5&enabled=true
// Parsed: { page: 5 (number), enabled: true (boolean) }
```

### Preprocess

```typescript
body: {
  schema: z.object({
    email: z.preprocess(
      (val) => typeof val === 'string' ? val.toLowerCase() : val,
      z.string().email()
    )
  })
}

// Input: { email: 'John@EXAMPLE.com' }
// Validated: { email: 'john@example.com' }
```

## Best Practices

### 1. Keep Schemas DRY

```typescript
// schemas/common.ts
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10)
})

// contracts/users.ts
import { paginationSchema } from '../schemas/common'

export const listUsersConfig = {
  query: {
    schema: paginationSchema.extend({
      search: z.string().optional()
    })
  }
} as const satisfies HandlerConfig
```

### 2. Use Descriptive Error Messages

```typescript
z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  email: z.string()
    .email('Please enter a valid email address'),
  age: z.number()
    .int('Age must be a whole number')
    .min(18, 'You must be at least 18 years old')
})
```

### 3. Validate Structure, Not Business Logic

Zod validates data structure. Business rules belong in handlers:

```typescript
// ✅ Good - Structure validation in Zod
body: {
  schema: z.object({
    email: z.string().email()
  })
}

// ✅ Good - Business logic in handler
handler(config, async (ctx) => {
  const existing = await db.users.findByEmail(ctx.body.email)
  if (existing) {
    throw new Error('Email already in use')
  }
})

// ❌ Bad - Business logic in Zod
body: {
  schema: z.object({
    email: z.string().email().refine(async (email) => {
      const existing = await db.users.findByEmail(email)
      return !existing
    })
  })
}
```

### 4. Share Schemas Between Create and Update

```typescript
const baseUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional()
})

export const createUserSchema = baseUserSchema
export const updateUserSchema = baseUserSchema.partial()
```

## Next Steps

- [Handlers](/guide/handlers) - Learn how to use validated data in handlers
- [Client](/guide/client) - Understand client-side validation
- [Custom Routes](/guide/custom-routes) - Advanced routing patterns

# Frontend Debugging Example

This example demonstrates how to use `@adi-family/http-mocks` for frontend development and debugging.

## Overview

This example shows:

- ✅ Switching between mock and real API clients
- ✅ Testing different UI states (loading, empty, error)
- ✅ Debugging edge cases (long text, special characters)
- ✅ Working offline with mock data
- ✅ Dev tools panel for toggling mocks
- ✅ Realistic mock data generation

## Files

- `api/configs.ts` - API contract definitions
- `api/client.ts` - Client setup with mock/real switching
- `api/dev-mocks.ts` - Mock data setup for development
- `hooks/useProjects.ts` - React hooks with TanStack Query
- `components/DevTools.tsx` - Dev tools panel
- `App.tsx` - Example React app

## Setup

```bash
npm install @adi-family/http @adi-family/http-mocks zod
npm install @tanstack/react-query
```

## Usage

### Toggle Mocks

In your browser console:

```javascript
// Enable mocks
localStorage.setItem('useMocks', 'true')
location.reload()

// Disable mocks (use real API)
localStorage.setItem('useMocks', 'false')
location.reload()
```

Or use the DevTools component in the bottom-right corner.

### Test Different Scenarios

```typescript
// Empty state
localStorage.setItem('mockScenario', 'empty')

// Loading state (slow network)
localStorage.setItem('mockScenario', 'slow')

// Error state
localStorage.setItem('mockScenario', 'error')

// Large dataset
localStorage.setItem('mockScenario', 'large')

// Edge cases
localStorage.setItem('mockScenario', 'edge')
```

## Key Features

### 1. Seamless Switching

The app automatically uses mocks in development and can be toggled at runtime:

```typescript
const client = useMocks ? mockClient : realClient;
```

### 2. Scenario Testing

Easily test different scenarios:

```typescript
if (scenario === 'empty') {
  mockClient.register(getProjectsConfig, { projects: [] });
}
```

### 3. Realistic Latency

Simulate network conditions:

```typescript
new MockClient({ delay: 500 }); // 500ms delay
```

### 4. Type Safety

All mock data is type-checked:

```typescript
mockClient.register(getUserConfig, {
  id: '1',
  name: 'Test User',
  // TypeScript ensures this matches the schema
});
```

## Development Workflow

1. Start development with mocks enabled
2. Build UI without waiting for backend
3. Test edge cases easily
4. Toggle to real API when backend is ready
5. Keep mocks for unit tests

## Benefits

- 🚀 **Faster Development** - No backend dependencies
- 🐛 **Better Debugging** - Test edge cases easily
- ✈️ **Offline Work** - Work anywhere
- 🎯 **Focused Testing** - Isolate frontend issues
- 🔄 **Easy Switching** - Toggle between mock and real data

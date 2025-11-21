import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import {
  generateMockRequest,
  generateMockResponse,
  generateMockScenario,
  generateMockScenarios,
  createMockContext,
  validateMockData,
  assertValidMockData,
  presets,
} from '../src/mock/utils';
import type { HandlerConfig } from '../src/types';

describe('generateMockRequest', () => {
  it('should generate params for pattern routes', () => {
    const config: HandlerConfig = {
      route: {
        type: 'pattern',
        pattern: '/users/:id',
        params: z.object({ id: z.string() }),
      },
    };

    const request = generateMockRequest(config);
    expect(request.params).toBeDefined();
    expect(typeof request.params.id).toBe('string');
  });

  it('should not generate params for static routes', () => {
    const config: HandlerConfig = {
      route: {
        type: 'static',
        path: '/users',
      },
    };

    const request = generateMockRequest(config);
    expect(request.params).toBeUndefined();
  });

  it('should generate query data', () => {
    const config: HandlerConfig = {
      route: { type: 'static', path: '/users' },
      query: {
        schema: z.object({
          page: z.number(),
          limit: z.number(),
        }),
      },
    };

    const request = generateMockRequest(config);
    expect(request.query).toBeDefined();
    expect(typeof request.query.page).toBe('number');
    expect(typeof request.query.limit).toBe('number');
  });

  it('should generate body data', () => {
    const config: HandlerConfig = {
      route: { type: 'static', path: '/users' },
      body: {
        schema: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      },
    };

    const request = generateMockRequest(config);
    expect(request.body).toBeDefined();
    expect(typeof request.body.name).toBe('string');
    expect(request.body.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
  });

  it('should generate all request parts', () => {
    const config: HandlerConfig = {
      route: {
        type: 'pattern',
        pattern: '/users/:id',
        params: z.object({ id: z.string() }),
      },
      query: {
        schema: z.object({ include: z.string() }),
      },
      body: {
        schema: z.object({ name: z.string() }),
      },
    };

    const request = generateMockRequest(config);
    expect(request.params).toBeDefined();
    expect(request.query).toBeDefined();
    expect(request.body).toBeDefined();
  });
});

describe('generateMockResponse', () => {
  it('should generate response data', () => {
    const config: HandlerConfig = {
      route: { type: 'static', path: '/users' },
      response: {
        schema: z.object({
          id: z.string(),
          name: z.string(),
        }),
      },
    };

    const response = generateMockResponse(config);
    expect(response).toBeDefined();
    expect(typeof response.id).toBe('string');
    expect(typeof response.name).toBe('string');
  });

  it('should return undefined when no response schema', () => {
    const config: HandlerConfig = {
      route: { type: 'static', path: '/users' },
    };

    const response = generateMockResponse(config);
    expect(response).toBeUndefined();
  });
});

describe('generateMockScenario', () => {
  it('should generate complete scenario', () => {
    const config: HandlerConfig = {
      route: {
        type: 'pattern',
        pattern: '/users/:id',
        params: z.object({ id: z.string() }),
      },
      body: {
        schema: z.object({ name: z.string() }),
      },
      response: {
        schema: z.object({
          id: z.string(),
          name: z.string(),
        }),
      },
    };

    const scenario = generateMockScenario(config);
    expect(scenario.request.params).toBeDefined();
    expect(scenario.request.body).toBeDefined();
    expect(scenario.response).toBeDefined();
  });
});

describe('generateMockScenarios', () => {
  it('should generate multiple scenarios', () => {
    const config: HandlerConfig = {
      route: { type: 'static', path: '/users' },
      response: {
        schema: z.object({ id: z.string() }),
      },
    };

    const scenarios = generateMockScenarios(config, 5);
    expect(scenarios.length).toBe(5);
    scenarios.forEach((scenario) => {
      expect(scenario.response).toBeDefined();
    });
  });

  it('should generate different data for each scenario', () => {
    const config: HandlerConfig = {
      route: { type: 'static', path: '/users' },
      response: {
        schema: z.object({ value: z.number() }),
      },
    };

    const scenarios = generateMockScenarios(config, 10);
    const values = scenarios.map((s) => s.response?.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBeGreaterThan(1);
  });
});

describe('createMockContext', () => {
  it('should create mock context with generated data', () => {
    const config: HandlerConfig = {
      route: {
        type: 'pattern',
        pattern: '/users/:id',
        params: z.object({ id: z.string() }),
      },
      query: {
        schema: z.object({ limit: z.number() }),
      },
      body: {
        schema: z.object({ name: z.string() }),
      },
    };

    const ctx = createMockContext(config);
    expect(ctx.params).toBeDefined();
    expect(ctx.query).toBeDefined();
    expect(ctx.body).toBeDefined();
    expect(ctx.headers).toBeInstanceOf(Headers);
  });

  it('should apply overrides', () => {
    const config: HandlerConfig = {
      route: {
        type: 'pattern',
        pattern: '/users/:id',
        params: z.object({ id: z.string() }),
      },
      body: {
        schema: z.object({ name: z.string(), age: z.number() }),
      },
    };

    const ctx = createMockContext(config, {
      params: { id: 'custom-id' },
      body: { name: 'Custom Name' },
    });

    expect(ctx.params.id).toBe('custom-id');
    expect(ctx.body.name).toBe('Custom Name');
    expect(typeof ctx.body.age).toBe('number'); // Generated
  });

  it('should apply header overrides', () => {
    const config: HandlerConfig = {
      route: { type: 'static', path: '/test' },
    };

    const ctx = createMockContext(config, {
      headers: {
        authorization: 'Bearer token123',
        'content-type': 'application/json',
      },
    });

    expect(ctx.headers.get('authorization')).toBe('Bearer token123');
    expect(ctx.headers.get('content-type')).toBe('application/json');
  });
});

describe('validateMockData', () => {
  it('should validate correct data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const data = { name: 'John', age: 30 };
    expect(validateMockData(schema, data)).toBe(true);
  });

  it('should invalidate incorrect data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const data = { name: 'John', age: 'thirty' };
    expect(validateMockData(schema, data)).toBe(false);
  });
});

describe('assertValidMockData', () => {
  it('should not throw for valid data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const data = { name: 'John', age: 30 };
    expect(() => assertValidMockData(schema, data)).not.toThrow();
  });

  it('should throw for invalid data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const data = { name: 'John', age: 'thirty' };
    expect(() => assertValidMockData(schema, data)).toThrow();
  });
});

describe('presets', () => {
  it('should generate mock ID', () => {
    const id = presets.id();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate mock email', () => {
    const email = presets.email();
    expect(typeof email).toBe('string');
    expect(email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
  });

  it('should generate mock URL', () => {
    const url = presets.url();
    expect(typeof url).toBe('string');
    expect(url).toMatch(/^https:\/\//);
  });

  it('should generate mock date', () => {
    const date = presets.date();
    expect(date).toBeInstanceOf(Date);
  });

  it('should generate mock timestamp', () => {
    const timestamp = presets.timestamp();
    expect(typeof timestamp).toBe('string');
    expect(() => new Date(timestamp)).not.toThrow();
  });

  it('should generate mock pagination', () => {
    const pagination = presets.pagination();
    expect(typeof pagination.page).toBe('number');
    expect(typeof pagination.limit).toBe('number');
    expect(typeof pagination.total).toBe('number');
    expect(typeof pagination.totalPages).toBe('number');
    expect(pagination.page).toBeGreaterThanOrEqual(1);
  });

  it('should generate mock error', () => {
    const error = presets.error();
    expect(typeof error.error).toBe('string');
    expect(typeof error.message).toBe('string');
    expect(typeof error.statusCode).toBe('number');
    expect(error.statusCode).toBeGreaterThanOrEqual(400);
    expect(error.statusCode).toBeLessThan(600);
  });

  it('should support seeded generation', () => {
    const id1 = presets.id(12345);
    const id2 = presets.id(12345);
    const id3 = presets.id(67890);

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
  });
});

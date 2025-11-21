import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import {
  createMockHandler,
  createSpyHandler,
  createMockHandlers,
} from '../src/mock/handler-mock';
import type { HandlerConfig } from '../src/types';

describe('createMockHandler', () => {
  const testConfig: HandlerConfig<
    { id: string },
    { limit: number },
    { name: string },
    { id: string; name: string }
  > = {
    method: 'POST',
    route: {
      type: 'pattern',
      pattern: '/projects/:id',
      params: z.object({ id: z.string() }),
    },
    query: {
      schema: z.object({ limit: z.number() }),
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

  it('should create a mock handler with static data', async () => {
    const mockData = { id: '123', name: 'Test Project' };
    const handler = createMockHandler(testConfig, { data: mockData });

    const ctx = {
      params: { id: '123' },
      query: { limit: 10 },
      body: { name: 'New Project' },
      headers: new Headers(),
      raw: null,
    };

    const result = await handler.fn(ctx);
    expect(result).toEqual(mockData);
  });

  it('should auto-generate data from response schema', async () => {
    const handler = createMockHandler(testConfig);

    const ctx = {
      params: { id: '123' },
      query: { limit: 10 },
      body: { name: 'New Project' },
      headers: new Headers(),
      raw: null,
    };

    const result = await handler.fn(ctx);
    expect(typeof result.id).toBe('string');
    expect(typeof result.name).toBe('string');
  });

  it('should use custom respond function', async () => {
    const handler = createMockHandler(testConfig, {
      respond: async (ctx) => ({
        id: ctx.params.id,
        name: `Project for ${ctx.params.id}`,
      }),
    });

    const ctx = {
      params: { id: 'custom-id' },
      query: { limit: 10 },
      body: { name: 'New Project' },
      headers: new Headers(),
      raw: null,
    };

    const result = await handler.fn(ctx);
    expect(result.id).toBe('custom-id');
    expect(result.name).toBe('Project for custom-id');
  });

  it('should simulate network delay', async () => {
    const handler = createMockHandler(testConfig, {
      data: { id: '123', name: 'Test' },
      delay: 50,
    });

    const ctx = {
      params: { id: '123' },
      query: { limit: 10 },
      body: { name: 'Test' },
      headers: new Headers(),
      raw: null,
    };

    const startTime = Date.now();
    await handler.fn(ctx);
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow some variance
  });

  it('should simulate errors', async () => {
    const testError = new Error('Test error');
    const handler = createMockHandler(testConfig, {
      error: testError,
    });

    const ctx = {
      params: { id: '123' },
      query: { limit: 10 },
      body: { name: 'Test' },
      headers: new Headers(),
      raw: null,
    };

    await expect(handler.fn(ctx)).rejects.toThrow('Test error');
  });

  it('should simulate errors with custom function', async () => {
    const handler = createMockHandler(testConfig, {
      error: (ctx) => new Error(`Error for ${ctx.params.id}`),
    });

    const ctx = {
      params: { id: '123' },
      query: { limit: 10 },
      body: { name: 'Test' },
      headers: new Headers(),
      raw: null,
    };

    await expect(handler.fn(ctx)).rejects.toThrow('Error for 123');
  });

  it('should return config', () => {
    const handler = createMockHandler(testConfig);
    expect(handler.config).toEqual(testConfig);
  });
});

describe('createSpyHandler', () => {
  const testConfig: HandlerConfig<
    { id: string },
    never,
    { name: string },
    { id: string; name: string }
  > = {
    method: 'POST',
    route: {
      type: 'pattern',
      pattern: '/projects/:id',
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

  it('should record calls', async () => {
    const spyHandler = createSpyHandler(testConfig, {
      data: { id: '123', name: 'Test' },
    });

    expect(spyHandler.callCount()).toBe(0);

    const ctx = {
      params: { id: '123' },
      query: undefined as never,
      body: { name: 'Project 1' },
      headers: new Headers(),
      raw: null,
    };

    await spyHandler.fn(ctx);
    expect(spyHandler.callCount()).toBe(1);

    await spyHandler.fn({
      ...ctx,
      body: { name: 'Project 2' },
    });
    expect(spyHandler.callCount()).toBe(2);
  });

  it('should track call details', async () => {
    const spyHandler = createSpyHandler(testConfig, {
      data: { id: '123', name: 'Test' },
    });

    const ctx = {
      params: { id: '456' },
      query: undefined as never,
      body: { name: 'Test Project' },
      headers: new Headers({ 'x-test': 'value' }),
      raw: null,
    };

    await spyHandler.fn(ctx);

    expect(spyHandler.calls.length).toBe(1);
    expect(spyHandler.calls[0].params).toEqual({ id: '456' });
    expect(spyHandler.calls[0].body).toEqual({ name: 'Test Project' });
    expect(spyHandler.calls[0].timestamp).toBeGreaterThan(0);
  });

  it('should support wasCalledWith matcher', async () => {
    const spyHandler = createSpyHandler(testConfig, {
      data: { id: '123', name: 'Test' },
    });

    await spyHandler.fn({
      params: { id: '123' },
      query: undefined as never,
      body: { name: 'Project A' },
      headers: new Headers(),
      raw: null,
    });

    await spyHandler.fn({
      params: { id: '456' },
      query: undefined as never,
      body: { name: 'Project B' },
      headers: new Headers(),
      raw: null,
    });

    expect(spyHandler.wasCalledWith({ params: { id: '123' } })).toBe(true);
    expect(spyHandler.wasCalledWith({ params: { id: '456' } })).toBe(true);
    expect(spyHandler.wasCalledWith({ params: { id: '789' } })).toBe(false);
    expect(spyHandler.wasCalledWith({ body: { name: 'Project A' } })).toBe(true);
    expect(spyHandler.wasCalledWith({ body: { name: 'Project C' } })).toBe(false);
  });

  it('should support lastCall', async () => {
    const spyHandler = createSpyHandler(testConfig, {
      data: { id: '123', name: 'Test' },
    });

    expect(spyHandler.lastCall()).toBeUndefined();

    await spyHandler.fn({
      params: { id: '123' },
      query: undefined as never,
      body: { name: 'First' },
      headers: new Headers(),
      raw: null,
    });

    expect(spyHandler.lastCall()?.body).toEqual({ name: 'First' });

    await spyHandler.fn({
      params: { id: '456' },
      query: undefined as never,
      body: { name: 'Second' },
      headers: new Headers(),
      raw: null,
    });

    expect(spyHandler.lastCall()?.body).toEqual({ name: 'Second' });
  });

  it('should support reset', async () => {
    const spyHandler = createSpyHandler(testConfig, {
      data: { id: '123', name: 'Test' },
    });

    await spyHandler.fn({
      params: { id: '123' },
      query: undefined as never,
      body: { name: 'Test' },
      headers: new Headers(),
      raw: null,
    });

    expect(spyHandler.callCount()).toBe(1);

    spyHandler.reset();
    expect(spyHandler.callCount()).toBe(0);
    expect(spyHandler.lastCall()).toBeUndefined();
  });

  it('should match header conditions', async () => {
    const spyHandler = createSpyHandler(testConfig, {
      data: { id: '123', name: 'Test' },
    });

    const headers = new Headers();
    headers.set('authorization', 'Bearer token123');

    await spyHandler.fn({
      params: { id: '123' },
      query: undefined as never,
      body: { name: 'Test' },
      headers,
      raw: null,
    });

    expect(
      spyHandler.wasCalledWith({
        headers: { authorization: 'Bearer token123' },
      })
    ).toBe(true);

    expect(
      spyHandler.wasCalledWith({
        headers: { authorization: 'Bearer wrong' },
      })
    ).toBe(false);
  });
});

describe('createMockHandlers', () => {
  it('should create multiple mock handlers', () => {
    const config1: HandlerConfig = {
      method: 'GET',
      route: { type: 'static', path: '/projects' },
      response: { schema: z.array(z.object({ id: z.string() })) },
    };

    const config2: HandlerConfig = {
      method: 'POST',
      route: { type: 'static', path: '/projects' },
      body: { schema: z.object({ name: z.string() }) },
      response: { schema: z.object({ id: z.string() }) },
    };

    const handlers = createMockHandlers([
      { config: config1, options: { data: [{ id: '1' }] } },
      { config: config2, options: { data: { id: '2' } } },
    ]);

    expect(handlers.length).toBe(2);
    expect(handlers[0].config).toBe(config1);
    expect(handlers[1].config).toBe(config2);
  });
});

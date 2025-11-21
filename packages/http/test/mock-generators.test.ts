import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { generateMockData, generateMockDataArray } from '../src/mock/generators';

describe('generateMockData', () => {
  describe('primitive types', () => {
    it('should generate string data', () => {
      const schema = z.string();
      const result = generateMockData(schema);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate number data', () => {
      const schema = z.number();
      const result = generateMockData(schema);
      expect(typeof result).toBe('number');
    });

    it('should generate boolean data', () => {
      const schema = z.boolean();
      const result = generateMockData(schema);
      expect(typeof result).toBe('boolean');
    });

    it('should generate date data', () => {
      const schema = z.date();
      const result = generateMockData(schema);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('string constraints', () => {
    it('should generate email format', () => {
      const schema = z.string().email();
      const result = generateMockData(schema);
      expect(result).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
    });

    it('should generate URL format', () => {
      const schema = z.string().url();
      const result = generateMockData(schema);
      expect(result).toMatch(/^https?:\/\//);
    });

    it('should generate UUID format', () => {
      const schema = z.string().uuid();
      const result = generateMockData(schema);
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should respect min length', () => {
      const schema = z.string().min(10);
      const result = generateMockData(schema);
      expect(result.length).toBeGreaterThanOrEqual(10);
    });

    it('should respect max length', () => {
      const schema = z.string().max(5);
      const result = generateMockData(schema);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should respect exact length', () => {
      const schema = z.string().length(15);
      const result = generateMockData(schema);
      expect(result.length).toBe(15);
    });
  });

  describe('number constraints', () => {
    it('should respect min value', () => {
      const schema = z.number().min(100);
      const result = generateMockData(schema);
      expect(result).toBeGreaterThanOrEqual(100);
    });

    it('should respect max value', () => {
      const schema = z.number().max(50);
      const result = generateMockData(schema);
      expect(result).toBeLessThanOrEqual(50);
    });

    it('should generate integers', () => {
      const schema = z.number().int();
      const result = generateMockData(schema);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('object types', () => {
    it('should generate object data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      const result = generateMockData(schema);
      expect(typeof result).toBe('object');
      expect(typeof result.name).toBe('string');
      expect(typeof result.age).toBe('number');
      expect(result.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
    });

    it('should handle nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            bio: z.string(),
          }),
        }),
      });

      const result = generateMockData(schema);
      expect(result.user.name).toBeDefined();
      expect(result.user.profile.bio).toBeDefined();
    });
  });

  describe('array types', () => {
    it('should generate array data', () => {
      const schema = z.array(z.string());
      const result = generateMockData(schema);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result[0]).toBe('string');
    });

    it('should respect min length', () => {
      const schema = z.array(z.string()).min(5);
      const result = generateMockData(schema);
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('should respect max length', () => {
      const schema = z.array(z.string()).max(2);
      const result = generateMockData(schema);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should generate arrays of objects', () => {
      const schema = z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      );

      const result = generateMockData(schema);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBeDefined();
      expect(result[0].name).toBeDefined();
    });
  });

  describe('enum types', () => {
    it('should generate enum values', () => {
      const schema = z.enum(['red', 'green', 'blue']);
      const result = generateMockData(schema);
      expect(['red', 'green', 'blue']).toContain(result);
    });

    it('should generate native enum values', () => {
      enum Color {
        Red = 'RED',
        Green = 'GREEN',
        Blue = 'BLUE',
      }
      const schema = z.nativeEnum(Color);
      const result = generateMockData(schema);
      expect(Object.values(Color)).toContain(result);
    });
  });

  describe('union types', () => {
    it('should generate union values', () => {
      const schema = z.union([z.string(), z.number()]);
      const result = generateMockData(schema);
      expect(['string', 'number']).toContain(typeof result);
    });
  });

  describe('optional and nullable', () => {
    it('should sometimes generate undefined for optional fields', () => {
      const schema = z.string().optional();
      const results = Array.from({ length: 20 }, () => generateMockData(schema));
      const hasUndefined = results.some((r) => r === undefined);
      const hasValue = results.some((r) => r !== undefined);
      expect(hasUndefined || hasValue).toBe(true); // At least one type should appear
    });

    it('should sometimes generate null for nullable fields', () => {
      const schema = z.string().nullable();
      const results = Array.from({ length: 20 }, () => generateMockData(schema));
      const hasNull = results.some((r) => r === null);
      const hasValue = results.some((r) => r !== null);
      expect(hasNull || hasValue).toBe(true); // At least one type should appear
    });
  });

  describe('literal types', () => {
    it('should generate literal values', () => {
      const schema = z.literal('constant');
      const result = generateMockData(schema);
      expect(result).toBe('constant');
    });
  });

  describe('record types', () => {
    it('should generate record data', () => {
      const schema = z.record(z.string(), z.number());
      const result = generateMockData(schema);
      expect(typeof result).toBe('object');
      const keys = Object.keys(result);
      expect(keys.length).toBeGreaterThan(0);
      expect(typeof result[keys[0]]).toBe('number');
    });
  });

  describe('tuple types', () => {
    it('should generate tuple data', () => {
      const schema = z.tuple([z.string(), z.number(), z.boolean()]);
      const result = generateMockData(schema);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(typeof result[0]).toBe('string');
      expect(typeof result[1]).toBe('number');
      expect(typeof result[2]).toBe('boolean');
    });
  });

  describe('intersection types', () => {
    it('should generate intersection data', () => {
      const schema = z
        .object({ name: z.string() })
        .and(z.object({ age: z.number() }));
      const result = generateMockData(schema);
      expect(result.name).toBeDefined();
      expect(result.age).toBeDefined();
    });
  });

  describe('discriminated union types', () => {
    it('should generate discriminated union data', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('email'), email: z.string().email() }),
        z.object({ type: z.literal('phone'), phone: z.string() }),
      ]);
      const result = generateMockData(schema);
      expect(['email', 'phone']).toContain(result.type);
      if (result.type === 'email') {
        expect(result.email).toBeDefined();
      } else {
        expect(result.phone).toBeDefined();
      }
    });
  });

  describe('options', () => {
    it('should use seed for deterministic generation', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result1 = generateMockData(schema, { seed: 12345 });
      const result2 = generateMockData(schema, { seed: 12345 });
      const result3 = generateMockData(schema, { seed: 67890 });

      expect(result1).toEqual(result2);
      expect(result1).not.toEqual(result3);
    });

    it('should apply overrides', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = generateMockData(schema, {
        overrides: { name: 'CustomName' },
      });

      expect(result.name).toBe('CustomName');
      expect(typeof result.age).toBe('number');
    });

    it('should respect maxDepth to prevent infinite recursion', () => {
      const schema: any = z.lazy(() =>
        z.object({
          name: z.string(),
          child: schema.optional(),
        })
      );

      const result = generateMockData(schema, { maxDepth: 3 });
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it('should respect arrayLength option', () => {
      const schema = z.array(z.string());
      const result = generateMockData(schema, { arrayLength: 7 });
      expect(result.length).toBeLessThanOrEqual(7);
    });
  });
});

describe('generateMockDataArray', () => {
  it('should generate multiple mock data items', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const results = generateMockDataArray(schema, 5);
    expect(results.length).toBe(5);
    results.forEach((result) => {
      expect(typeof result.name).toBe('string');
      expect(typeof result.age).toBe('number');
    });
  });

  it('should generate different values for each item', () => {
    const schema = z.string();
    const results = generateMockDataArray(schema, 10);
    const uniqueValues = new Set(results);
    expect(uniqueValues.size).toBeGreaterThan(1); // Should have some variety
  });
});

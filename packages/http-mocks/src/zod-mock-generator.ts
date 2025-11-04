import { z } from 'zod';

/**
 * Options for mock data generation
 */
export interface MockGeneratorOptions {
  /**
   * Seed for deterministic random generation
   */
  seed?: number;

  /**
   * Default string length
   */
  stringLength?: number;

  /**
   * Default array length
   */
  arrayLength?: number;

  /**
   * Custom generators for specific types
   */
  customGenerators?: Record<string, () => any>;
}

/**
 * Simple random number generator with optional seed for deterministic output
 */
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  next(): number {
    // Simple LCG algorithm
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Generates mock data from a Zod schema
 */
export function generateMock<T>(
  schema: z.ZodType<T>,
  options: MockGeneratorOptions = {}
): T {
  const random = new SeededRandom(options.seed);
  const stringLength = options.stringLength ?? 10;
  const arrayLength = options.arrayLength ?? 3;
  const customGenerators = options.customGenerators ?? {};

  function generate(schema: z.ZodType<any>): any {
    const def = (schema as any)._def;
    const typeName = def.typeName;

    // Check for custom generator
    if (customGenerators[typeName]) {
      return customGenerators[typeName]();
    }

    switch (typeName) {
      case 'ZodString': {
        // Check for specific string formats
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === 'email') {
              return `user${random.nextInt(1, 9999)}@example.com`;
            }
            if (check.kind === 'url') {
              return `https://example.com/path${random.nextInt(1, 9999)}`;
            }
            if (check.kind === 'uuid') {
              return '550e8400-e29b-41d4-a716-446655440000';
            }
            if (check.kind === 'cuid') {
              return 'cjld2cjxh0000qzrmn831i7rn';
            }
            if (check.kind === 'regex') {
              // For regex, generate a simple matching string
              const pattern = check.regex.toString();
              if (pattern.includes('\\d')) {
                return String(random.nextInt(100000, 999999));
              }
            }
          }
        }

        // Generate random string
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < stringLength; i++) {
          result += chars[random.nextInt(0, chars.length - 1)];
        }
        return result;
      }

      case 'ZodNumber': {
        let min = -1000;
        let max = 1000;

        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === 'min') {
              min = check.value;
            }
            if (check.kind === 'max') {
              max = check.value;
            }
            if (check.kind === 'int') {
              return random.nextInt(min, max);
            }
          }
        }

        return random.next() * (max - min) + min;
      }

      case 'ZodBoolean':
        return random.next() > 0.5;

      case 'ZodDate':
        return new Date(
          Date.now() - random.nextInt(0, 365 * 24 * 60 * 60 * 1000)
        );

      case 'ZodBigInt':
        return BigInt(random.nextInt(0, 1000000));

      case 'ZodNull':
        return null;

      case 'ZodUndefined':
        return undefined;

      case 'ZodLiteral':
        return def.value;

      case 'ZodEnum':
        const values = def.values;
        return values[random.nextInt(0, values.length - 1)];

      case 'ZodNativeEnum': {
        const enumValues = Object.values(def.values).filter(
          (v) => typeof v === 'string' || typeof v === 'number'
        );
        return enumValues[random.nextInt(0, enumValues.length - 1)];
      }

      case 'ZodOptional':
        // 70% chance of generating value, 30% undefined
        return random.next() > 0.3 ? generate(def.innerType) : undefined;

      case 'ZodNullable':
        // 70% chance of generating value, 30% null
        return random.next() > 0.3 ? generate(def.innerType) : null;

      case 'ZodDefault':
        return random.next() > 0.5 ? generate(def.innerType) : def.defaultValue();

      case 'ZodArray': {
        const length = random.nextInt(1, arrayLength);
        const items = [];
        for (let i = 0; i < length; i++) {
          items.push(generate(def.type));
        }
        return items;
      }

      case 'ZodObject': {
        const shape = def.shape();
        const result: Record<string, any> = {};

        for (const key in shape) {
          result[key] = generate(shape[key]);
        }

        return result;
      }

      case 'ZodUnion':
      case 'ZodDiscriminatedUnion': {
        const options = def.options || Array.from(def.optionsMap.values());
        return generate(options[random.nextInt(0, options.length - 1)]);
      }

      case 'ZodIntersection':
        return {
          ...generate(def.left),
          ...generate(def.right),
        };

      case 'ZodTuple': {
        const items = def.items;
        return items.map((item: z.ZodType<any>) => generate(item));
      }

      case 'ZodRecord': {
        const result: Record<string, any> = {};
        const numKeys = random.nextInt(1, 5);

        for (let i = 0; i < numKeys; i++) {
          const key = `key${i}`;
          result[key] = generate(def.valueType);
        }

        return result;
      }

      case 'ZodMap': {
        const map = new Map();
        const numEntries = random.nextInt(1, 5);

        for (let i = 0; i < numEntries; i++) {
          map.set(generate(def.keyType), generate(def.valueType));
        }

        return map;
      }

      case 'ZodSet': {
        const set = new Set();
        const numItems = random.nextInt(1, 5);

        for (let i = 0; i < numItems; i++) {
          set.add(generate(def.valueType));
        }

        return set;
      }

      case 'ZodEffects':
      case 'ZodTransformer':
        // Generate data for the underlying schema
        return generate(def.schema);

      case 'ZodAny':
        return { mockData: 'any type' };

      case 'ZodUnknown':
        return { mockData: 'unknown type' };

      case 'ZodNever':
        throw new Error('Cannot generate mock data for ZodNever');

      case 'ZodVoid':
        return undefined;

      case 'ZodLazy':
        return generate(def.getter());

      default:
        console.warn(`Unsupported Zod type: ${typeName}`);
        return null;
    }
  }

  return generate(schema);
}

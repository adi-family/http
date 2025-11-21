import { z } from 'zod';

/**
 * Options for configuring mock data generation
 */
export interface MockGeneratorOptions {
  /**
   * Seed for deterministic random generation
   */
  seed?: number;

  /**
   * Custom value overrides for specific paths
   */
  overrides?: Record<string, any>;

  /**
   * Maximum depth for nested objects/arrays to prevent infinite recursion
   */
  maxDepth?: number;

  /**
   * Default array length when generating array mocks
   */
  arrayLength?: number;
}

interface GeneratorContext {
  seed: number;
  depth: number;
  maxDepth: number;
  arrayLength: number;
  overrides: Record<string, any>;
  path: string[];
}

/**
 * Simple seeded random number generator using a Linear Congruential Generator (LCG)
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  integer(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  string(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[this.integer(0, chars.length - 1)];
    }
    return result;
  }

  email(): string {
    return `${this.string(8)}@${this.string(6)}.com`;
  }

  uuid(): string {
    const hex = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4';
      } else if (i === 19) {
        uuid += hex[this.integer(8, 11)];
      } else {
        uuid += hex[this.integer(0, 15)];
      }
    }
    return uuid;
  }

  url(): string {
    return `https://${this.string(8)}.com/${this.string(6)}`;
  }

  boolean(): boolean {
    return this.next() > 0.5;
  }

  date(start?: Date, end?: Date): Date {
    const startTime = start ? start.getTime() : Date.now() - 365 * 24 * 60 * 60 * 1000;
    const endTime = end ? end.getTime() : Date.now();
    return new Date(startTime + this.next() * (endTime - startTime));
  }

  arrayElement<T>(array: T[]): T {
    return array[this.integer(0, array.length - 1)];
  }
}

/**
 * Generate mock data from a Zod schema
 *
 * @example
 * ```ts
 * const userSchema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 *   email: z.string().email()
 * });
 *
 * const mockUser = generateMockData(userSchema);
 * // => { name: "aB3Cd5Ef", age: 42, email: "xY7zK@abc123.com" }
 * ```
 */
export function generateMockData<T extends z.ZodTypeAny>(
  schema: T,
  options: MockGeneratorOptions = {}
): z.infer<T> {
  const context: GeneratorContext = {
    seed: options.seed ?? Date.now(),
    depth: 0,
    maxDepth: options.maxDepth ?? 10,
    arrayLength: options.arrayLength ?? 3,
    overrides: options.overrides ?? {},
    path: [],
  };

  return generateFromSchema(schema, context);
}

function generateFromSchema(schema: z.ZodTypeAny, context: GeneratorContext): any {
  const random = new SeededRandom(context.seed + context.depth);
  const pathKey = context.path.join('.');

  // Check for overrides first
  if (pathKey in context.overrides) {
    return context.overrides[pathKey];
  }

  // Prevent infinite recursion
  if (context.depth > context.maxDepth) {
    return null;
  }

  const zodType = schema._def.typeName;

  switch (zodType) {
    case 'ZodString':
      return generateString(schema as z.ZodString, random);

    case 'ZodNumber':
      return generateNumber(schema as z.ZodNumber, random);

    case 'ZodBoolean':
      return random.boolean();

    case 'ZodDate':
      return random.date();

    case 'ZodArray':
      return generateArray(schema as z.ZodArray<any>, context);

    case 'ZodObject':
      return generateObject(schema as z.ZodObject<any>, context);

    case 'ZodEnum':
      return generateEnum(schema as z.ZodEnum<any>, random);

    case 'ZodNativeEnum':
      return generateNativeEnum(schema as z.ZodNativeEnum<any>, random);

    case 'ZodUnion':
      return generateUnion(schema as z.ZodUnion<any>, context);

    case 'ZodLiteral':
      return schema._def.value;

    case 'ZodNull':
      return null;

    case 'ZodUndefined':
      return undefined;

    case 'ZodOptional':
      // 70% chance to generate value for optional fields
      return random.next() > 0.3
        ? generateFromSchema(schema._def.innerType, context)
        : undefined;

    case 'ZodNullable':
      // 80% chance to generate value for nullable fields
      return random.next() > 0.2
        ? generateFromSchema(schema._def.innerType, context)
        : null;

    case 'ZodDefault':
      return generateFromSchema(schema._def.innerType, context);

    case 'ZodRecord':
      return generateRecord(schema as z.ZodRecord, context, random);

    case 'ZodTuple':
      return generateTuple(schema as z.ZodTuple, context);

    case 'ZodIntersection':
      return generateIntersection(schema as z.ZodIntersection<any, any>, context);

    case 'ZodDiscriminatedUnion':
      return generateDiscriminatedUnion(schema as z.ZodDiscriminatedUnion<any, any>, context);

    case 'ZodBigInt':
      return BigInt(random.integer(0, 1000000));

    case 'ZodAny':
      return { _mock: random.string(8) };

    case 'ZodUnknown':
      return { _mock: random.string(8) };

    default:
      console.warn(`Unsupported Zod type: ${zodType}, returning null`);
      return null;
  }
}

function generateString(schema: z.ZodString, random: SeededRandom): string {
  const checks = schema._def.checks || [];

  // Check for specific string formats
  for (const check of checks) {
    switch (check.kind) {
      case 'email':
        return random.email();
      case 'url':
        return random.url();
      case 'uuid':
        return random.uuid();
      case 'cuid':
        return `c${random.string(24)}`;
      case 'cuid2':
        return random.string(24);
    }
  }

  // Handle length constraints
  let minLength = 1;
  let maxLength = 20;

  for (const check of checks) {
    if (check.kind === 'min') {
      minLength = check.value;
    } else if (check.kind === 'max') {
      maxLength = check.value;
    } else if (check.kind === 'length') {
      minLength = maxLength = check.value;
    }
  }

  const length = random.integer(minLength, Math.min(maxLength, minLength + 20));
  return random.string(length);
}

function generateNumber(schema: z.ZodNumber, random: SeededRandom): number {
  const checks = schema._def.checks || [];

  let min = 0;
  let max = 1000;
  let isInt = false;

  for (const check of checks) {
    if (check.kind === 'min') {
      min = check.value;
    } else if (check.kind === 'max') {
      max = check.value;
    } else if (check.kind === 'int') {
      isInt = true;
    }
  }

  if (isInt) {
    return random.integer(min, max);
  }

  return min + random.next() * (max - min);
}

function generateArray(schema: z.ZodArray<any>, context: GeneratorContext): any[] {
  const itemSchema = schema._def.type;
  const minLength = schema._def.minLength?.value ?? 0;
  const maxLength = schema._def.maxLength?.value ?? context.arrayLength;

  const random = new SeededRandom(context.seed + context.depth);
  const length = random.integer(
    Math.max(minLength, 0),
    Math.max(maxLength, minLength)
  );

  const result: any[] = [];
  for (let i = 0; i < length; i++) {
    const itemContext = {
      ...context,
      depth: context.depth + 1,
      seed: context.seed + i,
      path: [...context.path, String(i)],
    };
    result.push(generateFromSchema(itemSchema, itemContext));
  }

  return result;
}

function generateObject(schema: z.ZodObject<any>, context: GeneratorContext): any {
  const shape = schema._def.shape();
  const result: any = {};

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fieldContext = {
      ...context,
      depth: context.depth + 1,
      seed: context.seed + key.split('').reduce((a, b) => a + b.charCodeAt(0), 0),
      path: [...context.path, key],
    };
    result[key] = generateFromSchema(fieldSchema as z.ZodTypeAny, fieldContext);
  }

  return result;
}

function generateEnum(schema: z.ZodEnum<any>, random: SeededRandom): any {
  const values = schema._def.values;
  return random.arrayElement(values);
}

function generateNativeEnum(schema: z.ZodNativeEnum<any>, random: SeededRandom): any {
  const enumValues = Object.values(schema._def.values);
  return random.arrayElement(enumValues);
}

function generateUnion(schema: z.ZodUnion<any>, context: GeneratorContext): any {
  const options = schema._def.options;
  const random = new SeededRandom(context.seed + context.depth);
  const selectedSchema = random.arrayElement(options);
  return generateFromSchema(selectedSchema, context);
}

function generateRecord(schema: z.ZodRecord, context: GeneratorContext, random: SeededRandom): any {
  const valueSchema = schema._def.valueType;
  const result: any = {};

  const numKeys = random.integer(1, 5);
  for (let i = 0; i < numKeys; i++) {
    const key = `key_${random.string(6)}`;
    const valueContext = {
      ...context,
      depth: context.depth + 1,
      seed: context.seed + i,
      path: [...context.path, key],
    };
    result[key] = generateFromSchema(valueSchema, valueContext);
  }

  return result;
}

function generateTuple(schema: z.ZodTuple, context: GeneratorContext): any[] {
  const items = schema._def.items;
  return items.map((itemSchema: z.ZodTypeAny, index: number) => {
    const itemContext = {
      ...context,
      depth: context.depth + 1,
      seed: context.seed + index,
      path: [...context.path, String(index)],
    };
    return generateFromSchema(itemSchema, itemContext);
  });
}

function generateIntersection(schema: z.ZodIntersection<any, any>, context: GeneratorContext): any {
  const left = generateFromSchema(schema._def.left, context);
  const right = generateFromSchema(schema._def.right, context);
  return { ...left, ...right };
}

function generateDiscriminatedUnion(
  schema: z.ZodDiscriminatedUnion<any, any>,
  context: GeneratorContext
): any {
  const options = Array.from(schema._def.options.values());
  const random = new SeededRandom(context.seed + context.depth);
  const selectedSchema = random.arrayElement(options);
  return generateFromSchema(selectedSchema, context);
}

/**
 * Generate multiple mock data samples from a schema
 *
 * @example
 * ```ts
 * const users = generateMockDataArray(userSchema, 5);
 * // => [{ name: "...", age: 25 }, { name: "...", age: 30 }, ...]
 * ```
 */
export function generateMockDataArray<T extends z.ZodTypeAny>(
  schema: T,
  count: number,
  options: MockGeneratorOptions = {}
): z.infer<T>[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (options.seed ?? Date.now()) + i * 1000;
    return generateMockData(schema, { ...options, seed });
  });
}

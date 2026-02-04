import { z } from 'zod';

/**
 * Generic validation helper using Zod schema
 * @param schema - Zod schema to validate against
 * @param data - Unknown data to validate
 * @returns Type guard that returns true if data matches schema
 */
export function validateWithSchema<T extends z.ZodType>(
  schema: T,
  data: unknown
): data is z.infer<T> {
  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

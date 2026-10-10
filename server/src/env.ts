import { z } from 'zod';

export const env = z.object({
  APP_ORIGIN: z.url().refine((value) => new URL(value).origin === value, 'APP_ORIGIN must be an origin without a trailing slash').default('http://localhost:5173'),
  DB_FILE_NAME: z.string().min(1).default('shiftmark.sqlite'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}).parse(process.env);

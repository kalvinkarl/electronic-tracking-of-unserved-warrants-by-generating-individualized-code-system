import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().default('etugis'),
  DB_USER: z.string().default('etugis_app'),
  DB_PASSWORD: z.string().default(''),
  DB_MIGRATION_USER: z.string().default('etugis_migrator'),
  DB_MIGRATION_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  SESSION_SECRET: z.string().default('local-development-only-secret-change-before-use'),
}).superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && (
      value.SESSION_SECRET.length < 32 ||
      value.SESSION_SECRET === 'local-development-only-secret-change-before-use'
    )) {
      context.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'Set a unique SESSION_SECRET of at least 32 characters in production' });
  }
});

export const config = configSchema.parse(process.env);
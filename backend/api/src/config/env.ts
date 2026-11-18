import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  PUBLIC_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),

  QR_HMAC_SECRET: z.string().min(1),
  TRANSFER_TTL_SECONDS: z.coerce.number().default(120),

  IMAGE_SERVICE_URL: z.string().url(),
  IMAGE_SERVICE_KEY: z.string().min(1),
  WM_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.75),
  IMAGE_SERVICE_MOCK: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default('false'),

  MANUFACTURER_INVITE_CODE: z.string().min(1),
  RETAILER_INVITE_CODE: z.string().min(1),

  STORAGE_DIR: z.string().default('./storage'),
  MAX_UPLOAD_MB: z.coerce.number().default(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

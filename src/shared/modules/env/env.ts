import { z } from 'zod';

export const envSchema = z.object({
  API_PORT: z.coerce.number().optional().default(3333),
  HOST: z.string().ip().optional().default('0.0.0.0'),
  NODE_ENV: z.enum(['production', 'development', 'test']),
  APP_KEY: z.string(),

  SWAGGER_AUTH_LOGIN: z.string().optional().default('admin'),
  SWAGGER_AUTH_PASSWORD: z.string().optional().default('admin'),

  FRONT_URL: z.string().url().default('http://localhost:5173'),
  SIMULADO_URL: z.string().url(),

  MONGODB: z.string().url(),
  MS_PORT: z.coerce.number(),

  FTP_HOST: z.string().ip(),
  FTP_USER: z.string(),
  FTP_PASSWORD: z.string(),
  FTP_TEMP_FILE: z.string(),
  FTP_PROFILE: z.string(),
  FTP_CONTENT: z.string(),
  VPS_IMAGE: z.string(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USERNAME: z.string().email(),
  SMTP_PASSWORD: z.string(),
  TEMPLATE_EMAIL: z.string(),
  TEMPLATE_EMAIL_ASSET: z.string(),
  MAIL_USERNAME: z.string().email(),
  MAIL_PASSWORD: z.string(),

  BLOB_PROVIDER: z.string(),
  AWS_ACCESS_KEY_ID: z.string(), //CLOUDFLARE_ACCOUNT_ID
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_ENDPOINT: z.string().url(),
  AWS_STORAGE_CLASS: z.enum(['STANDARD', 'ONEZONE_IA']),
  BUCKET_DOC: z.string(),
  BUCKET_PROFILE: z.string(),

  MY_HOST: z.string(),
  MY_PORT: z.coerce.number().default(3306),
  MY_USER: z.string(),
  MY_PASSWORD: z.string(),
  MY_DB_NAME: z.string().default('vcnafacul'),
});

export type Env = z.infer<typeof envSchema>;

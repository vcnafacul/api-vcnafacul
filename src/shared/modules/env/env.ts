import { z } from 'zod';

export const envSchema = z.object({
  API_PORT: z.coerce.number().default(3333),
  HOST: z.string().ip().default('0.0.0.0'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_KEY: z.string(),

  //DB
  MY_HOST: z.string().default('localhost'),
  MY_PORT: z.coerce.number().default(3306),
  MY_USER: z.string().default('root'),
  MY_PASSWORD: z.string().default('root'),
  MY_DB_NAME: z.string().default('cursinho'),

  //Docs
  SWAGGER_AUTH_LOGIN: z.string().default('vcnafacul'),
  SWAGGER_AUTH_PASSWORD: z.string().default('dev'),

  //STACK URLS
  FRONT_URL: z.string().url().default('http://localhost:5173'),
  SIMULADO_URL: z.string().url().default('http://localhost:3000'),
  DISCORD_WEBHOOK_URL: z
    .string()
    .url()
    .default('https://discord.com/api/webhooks/134'),

  //HOSPEDAGEM HOSTINGER
  FTP_HOST: z.string().ip(),
  FTP_CONTENT: z.string().default('/usr/share/nginx/html/'),
  FTP_USER: z.string().default('cursinho'),
  FTP_PASSWORD: z.string().default('cursinho'),
  VPS_IMAGE: z.string().default('cursinho'),
  FTP_PROFILE: z.string().default('cursinho'),

  //MAIL
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USERNAME: z.string().email(),
  SMTP_PASSWORD: z.string(),
  MAIL_USERNAME: z.string(),
  MAIL_PASSWORD: z.string(),
  TEMPLATE_EMAIL: z.string(),
  TEMPLATE_EMAIL_ASSET: z.string(),

  //S3
  BLOB_PROVIDER: z.enum(['S3']).default('S3'),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_ENDPOINT: z.string().url(),
  AWS_REGION: z.string().default('auto'),
  BUCKET_DOC: z.string().default('vcnafacul-docs'),
  BUCKET_PROFILE: z.string().default('vcnafacul-students-photo'),
  BUCKET_QUESTION: z.string().default('simulado-questoes'),
  BUCKET_SIMULADO: z.string().default('vcnafacul-simulado'),
  AWS_STORAGE_CLASS: z.enum(['STANDARD']).default('STANDARD'),

  //GRAFANA
  GRAFANA_HOST: z.string().url(),
  GRAFANA_USER_ID: z.coerce.number(),
  GRAFANA_TOKEN: z.string(),
});

export type Env = z.infer<typeof envSchema>;

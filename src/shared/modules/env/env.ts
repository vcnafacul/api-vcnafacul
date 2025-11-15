import { z } from 'zod';

export const envSchema = z.object({
  API_PORT: z.coerce.number().default(3333),
  HOST: z.string().ip().default('0.0.0.0'),
  NODE_ENV: z
    .enum(['development', 'homologation', 'test', 'production'])
    .default('development'),
  APP_KEY: z.string().default('vcnafacul'),

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
  FORMULARIO_URL: z.string().url().default('http://localhost:3334'),
  DISCORD_WEBHOOK_URL: z
    .string()
    .url()
    .default('https://discord.com/api/webhooks/134'),

  //HOSPEDAGEM HOSTINGER
  FTP_HOST: z.string().ip().default('0.0.0.0'),
  FTP_USER: z.string().default('cursinho'),
  FTP_PASSWORD: z.string().default('cursinho'),
  FTP_PROFILE: z.string().default('cursinho'),

  //MAIL
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USERNAME: z.string().email().default('smtp@smtp.com.br'),
  SMTP_PASSWORD: z.string().default('password'),
  MAIL_USERNAME: z.string().default('smtp@smtp.com.br'),
  MAIL_PASSWORD: z.string().default('password'),
  TEMPLATE_EMAIL: z.string().default('vcnafacul'),
  TEMPLATE_EMAIL_ASSET: z.string().default('vcnafacul'),

  //S3
  BLOB_PROVIDER: z.enum(['S3']).default('S3'),
  AWS_ACCESS_KEY_ID: z.string().default('vcnafacul'),
  AWS_SECRET_ACCESS_KEY: z.string().default('vcnafacul'),
  AWS_ENDPOINT: z.string().url().default('http://localhost:9000'),
  AWS_REGION: z.string().default('auto'),
  BUCKET_DOC: z.string().default('vcnafacul-docs'),
  BUCKET_STUDENT_DOC: z.string().default('vcnafacul-docs'),
  BUCKET_PROFILE: z.string().default('vcnafacul-students-photo'),
  BUCKET_QUESTION: z.string().default('simulado-questoes'),
  BUCKET_SIMULADO: z.string().default('vcnafacul-simulado'),
  BUCKET_CONTENT: z.string().default('vcnafacul-content'),
  BUCKET_PARTNERSHIP_DOC: z.string().default('vcnafacul-partnership-doc'),
  AWS_STORAGE_CLASS: z.enum(['STANDARD']).default('STANDARD'),

  //GRAFANA
  GRAFANA_HOST: z.string().url().default('http://localhost:3000'),
  GRAFANA_USER_ID: z.coerce.number().default(1),
  GRAFANA_TOKEN: z.string().default('vcnafacul'),

  //Cache
  CACHE_DRIVER: z.string().default('inMemory'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_HOST: z.string().default('localhost'),
});

export type Env = z.infer<typeof envSchema>;

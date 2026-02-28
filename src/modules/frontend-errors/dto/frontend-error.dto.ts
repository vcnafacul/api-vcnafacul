/**
 * Payload enviado pelo frontend (não confiar: será sanitizado).
 * Campos permitidos em whitelist no serviço.
 */
export interface FrontendErrorBodyDto {
  errorType?: string;
  message?: string;
  page?: string;
  origin?: string;
  request?: {
    method?: string;
    url?: string;
  };
  user?: { id?: string };
  metadata?: {
    userAgent?: string;
    online?: boolean;
    release?: string;
  };
  /** Opcional: stack ou detalhe do erro (será truncado) */
  errorDetail?: string;
}

/**
 * Payload sanitizado para log (whitelist aplicada).
 */
export interface SanitizedFrontendErrorDto {
  source: 'frontend';
  userId?: string;
  errorType?: string;
  message?: string;
  page?: string;
  origin?: string;
  request?: {
    method?: string;
    url?: string;
  };
  metadata?: {
    userAgent?: string;
    online?: boolean;
    release?: string;
  };
  errorDetail?: string;
  ip?: string;
  severity: 'normal' | 'severe';
}

/**
 * Configurações de rate limiting para envio de emails
 * Ajustado para respeitar os limites do SMTP Hostinger
 */
export const EMAIL_CONFIG = {
  /**
   * Número máximo de destinatários BCC por email
   * Hostinger geralmente limita a 50-100 destinatários por email
   */
  MAX_BCC_PER_EMAIL: 30,

  /**
   * Delay entre envios de chunks de emails (em milissegundos)
   * 3 segundos entre cada envio para evitar rate limiting
   */
  DELAY_BETWEEN_CHUNKS_MS: 3000,

  /**
   * Delay mínimo entre envios individuais (em milissegundos)
   */
  DELAY_BETWEEN_EMAILS_MS: 1000,

  /**
   * Número máximo de emails por hora (conservador)
   */
  MAX_EMAILS_PER_HOUR: 80,

  /**
   * Número máximo de tentativas de reenvio em caso de falha
   */
  MAX_RETRY_ATTEMPTS: 3,

  /**
   * Delay entre tentativas de reenvio (em milissegundos)
   */
  RETRY_DELAY_MS: 5000,
} as const;

/**
 * Configurações de rate limiting para endpoints
 */
export const THROTTLE_CONFIG = {
  /**
   * Rate limiting para endpoint de esqueci senha
   * 3 requisições a cada 60 segundos por IP
   */
  FORGOT_PASSWORD: {
    ttl: 60000, // 60 segundos
    limit: 3,
  },

  /**
   * Rate limiting para criação de usuário
   * 5 requisições a cada 60 segundos por IP
   */
  CREATE_USER: {
    ttl: 60000,
    limit: 5,
  },

  /**
   * Rate limiting para envio de email em massa
   * 1 requisição a cada 5 minutos
   */
  BULK_EMAIL: {
    ttl: 300000, // 5 minutos
    limit: 1,
  },

  /**
   * Rate limiting para lista de espera
   * 2 requisições a cada 10 minutos
   */
  WAITING_LIST: {
    ttl: 600000, // 10 minutos
    limit: 2,
  },

  /**
   * Rate limiting global padrão
   * 100 requisições a cada 60 segundos por IP
   */
  DEFAULT: {
    ttl: 60000,
    limit: 100,
  },
} as const;


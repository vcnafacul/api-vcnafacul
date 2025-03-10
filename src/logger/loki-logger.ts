import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LokiTransport = require('winston-loki');

@Injectable()
export class LokiLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    const USER_ID = process.env.GRAFANA_USER_ID;
    const API_KEY = process.env.GRAFANA_TOKEN;
    const HOST = process.env.GRAFANA_HOST;

    const lokiTransport = new LokiTransport({
      host: HOST,
      labels: { app: 'vcnafacul-logs' },
      json: true,
      basicAuth: `${USER_ID}:${API_KEY}`,
      onConnectionError: (err: any) =>
        console.error('Erro ao conectar ao Loki:', err),
      level: 'info',
    });

    this.logger = createLogger({
      transports: [
        lokiTransport,
        new transports.Console({
          format: format.combine(format.timestamp(), format.json()),
        }),
      ],
    });
  }

  log(message: any, ...optionalParams: any[]) {
    if (
      optionalParams.length > 0 &&
      !['RoutesResolver', 'RouterExplorer'].includes(optionalParams[0])
    ) {
      this.logger.info(message, { optionalParams });
    }
  }
  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, { optionalParams });
  }
  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, { optionalParams });
  }
  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, { optionalParams });
  }
  verbose?(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, { optionalParams });
  }
  fatal?(message: any, ...optionalParams: any[]) {
    this.logger.error(message, { optionalParams });
  }
  setLogLevels?(levels: LogLevel[]) {
    throw new Error(levels.toString());
  }
}

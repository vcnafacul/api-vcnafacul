import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthCheckService {
  private readonly logger = new Logger(DatabaseHealthCheckService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_5_MINUTES) // a cada 5 minutos
  async handleCron() {
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.debug('Conexão com o banco verificada com sucesso');
    } catch (error) {
      this.logger.error('Erro ao verificar conexão com o banco:', error);
    }
  }
}

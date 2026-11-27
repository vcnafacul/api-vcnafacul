import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EnvService } from '../../shared/modules/env/env.service';
import { EmailWhitelistService } from './email-whitelist.service';

/**
 * Desliga (`is_actived = false`) as liberações da whitelist que passaram do
 * `expired_at`. O envio só olha o `is_actived`, então o atraso máximo entre
 * vencer e voltar para o Mailpit é o intervalo deste cron (1h).
 *
 * ⚠️ Sem lock, como os outros crons do projeto: é um `UPDATE` com `WHERE` de
 * data — rodar duas vezes dá no mesmo. Em produção não faz nada.
 */
@Injectable()
export class EmailWhitelistTask {
  private readonly logger = new Logger(EmailWhitelistTask.name);

  constructor(
    private readonly service: EmailWhitelistService,
    private readonly envService: EnvService,
  ) {}

  @Cron('0 * * * *', {
    name: 'email-whitelist-vencidos',
    timeZone: 'America/Sao_Paulo',
  })
  async desativarVencidos(agora: Date = new Date()): Promise<number> {
    if (this.envService.get('NODE_ENV') === 'production') return 0;
    const desativados = await this.service.desativarVencidos(agora);
    if (desativados) {
      this.logger.log(
        `Whitelist de e-mail: ${desativados} liberação(ões) vencida(s) desligada(s)`,
      );
    }
    return desativados;
  }
}

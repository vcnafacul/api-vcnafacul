import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { QueueConsumer } from '../queue.consumer';
import { MessageHandler } from '../queue.types';

type Registration = {
  stream: string;
  group: string;
  consumer: string;
  handler: MessageHandler;
};

@Injectable()
export class ValkeyQueueConsumer
  extends QueueConsumer
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ValkeyQueueConsumer.name);
  private running = false;
  private readonly registrations: Registration[] = [];

  constructor(@Inject('QUEUE_REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  register(
    stream: string,
    group: string,
    consumer: string,
    handler: MessageHandler,
  ) {
    this.registrations.push({ stream, group, consumer, handler });
  }

  // onApplicationBootstrap (not onModuleInit) runs only after every module's
  // onModuleInit has finished, guaranteeing register() has already been
  // called by consumers like AnswerProcessorService before we start polling.
  async onApplicationBootstrap() {
    for (const { stream, group } of this.registrations) {
      await this.ensureGroup(stream, group);
    }
    this.running = true;
    this.poll().catch((err) => this.logger.error('Polling error:', err));
  }

  onModuleDestroy() {
    this.running = false;
  }

  // Grupo criado lendo do INÍCIO ('0'), não só do que chegar depois ('$'): o
  // recoverPending republica os pendentes antes deste ponto, e um Redis
  // recriado vazio pode já ter mensagem na fila. Mensagem processada é apagada
  // (xdel), então ler do início não reprocessa nada.
  private async ensureGroup(stream: string, group: string) {
    try {
      await this.redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) throw err;
    }
  }

  private async poll() {
    while (this.running) {
      if (this.registrations.length === 0) {
        // Never spin the loop without an await: with no registrations this
        // would pin the event loop at 100% CPU and freeze the whole app.
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      for (const reg of this.registrations) {
        // Um erro de leitura não pode matar o laço: antes, uma exceção aqui
        // subia até o poll().catch e a fila ficava sem leitor até reiniciar o
        // ms (tickets/056 · 05b).
        try {
          await this.readAndProcess(reg);
        } catch (err: any) {
          await this.recoverFromReadError(reg, err);
          continue;
        }
        await this.reclaimStale(reg);
      }
    }
  }

  private async recoverFromReadError(reg: Registration, err: any) {
    try {
      if (String(err?.message).includes('NOGROUP')) {
        // Redis recriado (ou stream apagado): o grupo sumiu.
        this.logger.warn(
          `Grupo ${reg.group} sumiu de ${reg.stream}; recriando`,
        );
        await this.ensureGroup(reg.stream, reg.group);
        return;
      }
      this.logger.error(`Read error on ${reg.stream}:`, err);
    } catch (recreateErr) {
      this.logger.error(
        `Could not recreate group on ${reg.stream}:`,
        recreateErr,
      );
    }
    // Redis fora do ar ou erro inesperado: pausa antes de tentar de novo.
    await new Promise((r) => setTimeout(r, 1000));
  }

  private async readAndProcess({
    stream,
    group,
    consumer,
    handler,
  }: Registration) {
    const results = (await this.redis.xreadgroup(
      'GROUP',
      group,
      consumer,
      'COUNT',
      '10',
      'BLOCK',
      '2000',
      'STREAMS',
      stream,
      '>',
    )) as [string, [string, string[]][]][] | null;

    if (!results) return;

    for (const [, messages] of results) {
      for (const [id, rawFields] of messages) {
        const fields = this.parseFields(rawFields);
        try {
          await handler(id, fields);
          await this.redis.xack(stream, group, id);
          await this.redis.xdel(stream, id);
        } catch (err) {
          this.logger.error(`Failed processing ${id} from ${stream}:`, err);
        }
      }
    }
  }

  private async reclaimStale({
    stream,
    group,
    consumer,
    handler,
  }: Registration) {
    if (!this.running) return;

    await new Promise((r) => setTimeout(r, 100));

    try {
      const result = await this.redis.xautoclaim(
        stream,
        group,
        consumer,
        '60000',
        '0-0',
        'COUNT',
        '5',
      );

      if (!result) return;

      const [, messages] = result as [string, [string, string[]][], string[]];

      for (const [id, rawFields] of messages) {
        const fields = this.parseFields(rawFields);
        try {
          await handler(id, fields);
          await this.redis.xack(stream, group, id);
          await this.redis.xdel(stream, id);
        } catch (err) {
          this.logger.error(`Failed reclaiming ${id} from ${stream}:`, err);
        }
      }
    } catch (err) {
      this.logger.error(`Reclaim process error for ${stream}:`, err);
    }
  }

  private parseFields(raw: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < raw.length; i += 2) {
      result[raw[i]] = raw[i + 1];
    }
    return result;
  }
}

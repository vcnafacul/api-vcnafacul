import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, LessThan, LessThanOrEqual } from 'typeorm';
import {
  PushResultadoCartao,
  StatusDoPushDeResultado,
} from './push-resultado-cartao.entity';

export type ResultadoDoCartao = Pick<
  PushResultadoCartao,
  | 'historicoId'
  | 'userId'
  | 'simulado'
  | 'total'
  | 'acertos'
  | 'erros'
  | 'emBranco'
  | 'aproveitamento'
>;

@Injectable()
export class PushResultadoCartaoRepository {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  private get repo() {
    return this.manager.getRepository(PushResultadoCartao);
  }

  /**
   * ⚠️ Upsert por `historico_id`: avisos repetidos do mesmo histórico viram
   * UMA linha com os números do último, de volta a `pendente`. `envios` fica —
   * é ele que faz o próximo push sair como "Resultado atualizado".
   */
  async guardar(r: ResultadoDoCartao, agora = new Date()): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(PushResultadoCartao)
      .values({
        ...r,
        status: StatusDoPushDeResultado.Pendente,
        tentativas: 0,
        proximaTentativaEm: agora,
      })
      .orUpdate(
        [
          'user_id',
          'simulado',
          'total',
          'acertos',
          'erros',
          'em_branco',
          'aproveitamento',
          'status',
          'tentativas',
          'proxima_tentativa_em',
        ],
        ['historico_id'],
      )
      .execute();
  }

  porHistorico(historicoId: string) {
    return this.repo.findOne({ where: { historicoId } });
  }

  // ---- envio calmo (card 03) ----

  /** Os mais antigos primeiro, só os que já podem sair. */
  pendentesVencidos(limite: number, agora = new Date()) {
    return this.repo.find({
      where: {
        status: StatusDoPushDeResultado.Pendente,
        proximaTentativaEm: LessThanOrEqual(agora),
      },
      order: { proximaTentativaEm: 'ASC' },
      take: limite,
    });
  }

  /**
   * ⚠️ Reserva atômica: só UM chamador consegue passar a linha para
   * `enviando` (`affected = 1`) — duas rodadas ou duas instâncias nunca mandam
   * o mesmo push.
   */
  async reservar(id: string, agora = new Date()): Promise<boolean> {
    const r = await this.repo.update(
      { id, status: StatusDoPushDeResultado.Pendente },
      { status: StatusDoPushDeResultado.Enviando, updatedAt: agora },
    );
    return r.affected === 1;
  }

  /**
   * ⚠️ `envios + 1` sempre, mas só fecha como `enviado` se a linha AINDA está
   * `enviando`. Se um aviso novo do mesmo cartão chegou durante o envio, o
   * upsert já a voltou para `pendente` — e ela sai de novo, como "atualizado".
   */
  async marcarEnviado(id: string, agora = new Date()): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(PushResultadoCartao)
      .set({
        envios: () => 'envios + 1',
        tentativas: 0,
        updatedAt: agora,
        status: () =>
          `CASE WHEN status = '${StatusDoPushDeResultado.Enviando}' THEN '${StatusDoPushDeResultado.Enviado}' ELSE status END`,
      })
      .where('id = :id', { id })
      .execute();
  }

  async reagendar(id: string, tentativas: number, quando: Date): Promise<void> {
    await this.repo.update(
      { id },
      {
        status: StatusDoPushDeResultado.Pendente,
        tentativas,
        proximaTentativaEm: quando,
      },
    );
  }

  async marcarFalhou(id: string, tentativas: number): Promise<void> {
    await this.repo.update(
      { id },
      { status: StatusDoPushDeResultado.Falhou, tentativas },
    );
  }

  /** Push desligado (fora de prod): tira da fila sem enviar. */
  async ignorarPendentes(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.repo.update(
      { id: In(ids) },
      { status: StatusDoPushDeResultado.Ignorado },
    );
  }

  /**
   * Linha presa em `enviando` (a api caiu no meio do envio) volta a
   * `pendente` depois de `minutos` — o push é idempotente o bastante para
   * isso (no pior caso o aluno recebe o mesmo resultado duas vezes).
   */
  async destravarEnviando(minutos: number, agora = new Date()): Promise<void> {
    await this.repo.update(
      {
        status: StatusDoPushDeResultado.Enviando,
        updatedAt: LessThan(new Date(agora.getTime() - minutos * 60_000)),
      },
      { status: StatusDoPushDeResultado.Pendente },
    );
  }
}

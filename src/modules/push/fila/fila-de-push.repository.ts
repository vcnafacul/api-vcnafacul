import {
  EntityManager,
  EntityTarget,
  In,
  LessThan,
  LessThanOrEqual,
} from 'typeorm';
import { StatusDoPushDeResultado } from '../resultado-cartao/push-resultado-cartao.entity';

/** O que uma linha de fila de push precisa ter para o envio calmo. */
export interface LinhaDaFila {
  id: string;
  userId: string;
  status: StatusDoPushDeResultado;
  envios: number;
  tentativas: number;
  proximaTentativaEm: Date;
  updatedAt: Date;
}

/**
 * A fila de um tipo de push (tickets/028; generalizada no 042, card 17):
 * vencidos, reserva atômica, fechamento, nova tentativa, falha, destrava.
 *
 * ⚠️ É a mesma lógica para as duas filas — resultado do cartão e "nota
 * atualizada". Duas cópias dela divergiriam no primeiro conserto.
 */
export abstract class FilaDePushRepository<L extends LinhaDaFila> {
  protected constructor(
    protected readonly manager: EntityManager,
    private readonly entidade: EntityTarget<L>,
  ) {}

  protected get repo() {
    return this.manager.getRepository<L>(this.entidade);
  }

  /** Os mais antigos primeiro, só os que já podem sair. */
  pendentesVencidos(limite: number, agora = new Date()): Promise<L[]> {
    return this.repo.find({
      where: {
        status: StatusDoPushDeResultado.Pendente,
        proximaTentativaEm: LessThanOrEqual(agora),
      } as never,
      order: { proximaTentativaEm: 'ASC' } as never,
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
      { id, status: StatusDoPushDeResultado.Pendente } as never,
      { status: StatusDoPushDeResultado.Enviando, updatedAt: agora } as never,
    );
    return r.affected === 1;
  }

  /**
   * ⚠️ `envios + 1` sempre, mas só fecha como `enviado` se a linha AINDA está
   * `enviando` (um aviso novo durante o envio pode tê-la voltado a `pendente`).
   */
  async marcarEnviado(id: string, agora = new Date()): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(this.entidade)
      .set({
        envios: () => 'envios + 1',
        tentativas: 0,
        updatedAt: agora,
        status: () =>
          `CASE WHEN status = '${StatusDoPushDeResultado.Enviando}' THEN '${StatusDoPushDeResultado.Enviado}' ELSE status END`,
      } as never)
      .where('id = :id', { id })
      .execute();
  }

  async reagendar(id: string, tentativas: number, quando: Date): Promise<void> {
    await this.repo.update(
      { id } as never,
      {
        status: StatusDoPushDeResultado.Pendente,
        tentativas,
        proximaTentativaEm: quando,
      } as never,
    );
  }

  async marcarFalhou(id: string, tentativas: number): Promise<void> {
    await this.repo.update(
      { id } as never,
      { status: StatusDoPushDeResultado.Falhou, tentativas } as never,
    );
  }

  /** Push desligado (fora de prod): tira da fila sem enviar. */
  async ignorarPendentes(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.repo.update(
      { id: In(ids) } as never,
      { status: StatusDoPushDeResultado.Ignorado } as never,
    );
  }

  /** Linha presa em `enviando` volta a `pendente` depois de `minutos`. */
  async destravarEnviando(minutos: number, agora = new Date()): Promise<void> {
    await this.repo.update(
      {
        status: StatusDoPushDeResultado.Enviando,
        updatedAt: LessThan(new Date(agora.getTime() - minutos * 60_000)),
      } as never,
      { status: StatusDoPushDeResultado.Pendente } as never,
    );
  }
}

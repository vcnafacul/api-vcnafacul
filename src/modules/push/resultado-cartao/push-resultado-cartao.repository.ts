import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
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
}

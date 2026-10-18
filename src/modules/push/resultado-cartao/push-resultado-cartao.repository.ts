import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { FilaDePushRepository } from '../fila/fila-de-push.repository';
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
export class PushResultadoCartaoRepository extends FilaDePushRepository<PushResultadoCartao> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(manager, PushResultadoCartao);
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

  // ---- envio calmo (card 03): herdado de `FilaDePushRepository` ----

  /**
   * Card 36 — o envio do cartão foi excluído (aluno errado): o resultado que
   * ainda não saiu não sai mais.
   *
   * ⚠️ Só `pendente` e `enviando`. O que já foi `enviado` não tem volta — o
   * push está no celular —, e reescrever o status apagaria esse fato.
   * `enviando` entra porque o `marcarEnviado` só fecha como `enviado` a linha
   * que ainda está `enviando`: a marcada aqui fica `ignorado`.
   */
  async ignorarDoHistorico(historicoId: string): Promise<void> {
    await this.repo.update(
      {
        historicoId,
        status: In([
          StatusDoPushDeResultado.Pendente,
          StatusDoPushDeResultado.Enviando,
        ]),
      },
      { status: StatusDoPushDeResultado.Ignorado },
    );
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { PushResultadoCartaoRepository } from '../../push/resultado-cartao/push-resultado-cartao.repository';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { CartaoRespostaHttpService } from './cartao-resposta-http.service';

/**
 * Card 36 — "Excluir envio": desfaz um cartão enviado para o aluno errado.
 *
 * Quem apaga o que importa (histórico, contadores, relatório, auditoria) é o
 * ms. Aqui fica o que só a api tem: o push do resultado que ainda não saiu e
 * a foto no bucket.
 *
 * ⚠️ **Push e foto vêm DEPOIS do ms, e não derrubam a resposta.** O dado que
 * a pessoa veio corrigir já foi corrigido; um push que escapa ou uma foto que
 * sobra no bucket não justificam dizer à tela que a exclusão falhou — e um
 * novo clique daria 404, porque o ms já não acha o histórico.
 */
@Injectable()
export class CartaoExclusaoService {
  private readonly logger = new Logger(CartaoExclusaoService.name);

  constructor(
    @Inject('BlobService')
    private readonly blobService: BlobService,
    private readonly cartaoHttp: CartaoRespostaHttpService,
    private readonly cursinhoResolver: CursinhoResolverService,
    private readonly pushResultado: PushResultadoCartaoRepository,
    private readonly env: EnvService,
  ) {}

  async excluir(colaboradorUserId: string, historicoId: string): Promise<void> {
    // ⚠️ Do JWT, nunca do corpo. Mesmo padrão do `CartaoReprocessoService`.
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    // 404 (outro cursinho) e 409 (leitura em andamento) passam como vieram.
    const { imageKey } = await this.cartaoHttp.excluir(historicoId, {
      cursinhoId,
      excluidoPor: colaboradorUserId,
    });

    try {
      await this.pushResultado.ignorarDoHistorico(historicoId);
    } catch (err) {
      this.logger.warn(
        `push do histórico ${historicoId} não foi tirado da fila: ${String(err)}`,
      );
    }

    if (!imageKey) return;
    try {
      await this.blobService.deleteFile(
        imageKey,
        this.env.get('BUCKET_CARTAO'),
      );
    } catch (err) {
      this.logger.warn(
        `foto ${imageKey} ficou órfã no bucket após excluir ${historicoId}: ${String(err)}`,
      );
    }
  }
}

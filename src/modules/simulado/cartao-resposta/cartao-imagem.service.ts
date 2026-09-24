import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { CartaoRespostaHttpService } from './cartao-resposta-http.service';

/** 10 minutos — pedido do QA: quem baixa costuma baixar de novo logo depois. */
export const TTL_IMAGEM_DO_CARTAO_MS = 10 * 60 * 1000;

export interface ImagemDoCartao {
  buffer: Buffer;
  contentType: string;
  nomeDoArquivo: string;
}

/**
 * A foto do cartão enviado, para o download no relatório do simulado.
 *
 * ⚠️ **O gate roda SEMPRE; só a imagem vai para o cache.** Quem pode baixar é
 * decidido pelo ms a cada pedido (histórico E cursinho do JWT). Guardar a
 * resposta inteira por `historicoId` deixaria outro cursinho pegar do cache o
 * que o gate recusaria.
 *
 * ⚠️ **Cache pela `imageKey`, não pelo histórico.** A chave é nova a cada
 * reenvio (ver `CartaoReprocessoService`), então o conteúdo de uma chave nunca
 * muda — não há o que invalidar, e a foto trocada nunca sai velha do cache.
 */
@Injectable()
export class CartaoImagemService {
  constructor(
    @Inject('BlobService')
    private readonly blobService: BlobService,
    private readonly cartaoHttp: CartaoRespostaHttpService,
    private readonly cursinhoResolver: CursinhoResolverService,
    private readonly cache: CacheService,
    private readonly env: EnvService,
  ) {}

  async baixar(
    colaboradorUserId: string,
    historicoId: string,
  ): Promise<ImagemDoCartao> {
    // ⚠️ Do JWT, nunca da requisição.
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);
    const { imageKey } = await this.cartaoHttp.localizarImagem(historicoId, {
      cursinhoId,
    });

    // `getFile` devolve base64 — é o que serializa no cache sem perda.
    const arquivo = await this.cache.wrap<{
      buffer: string;
      contentType: string;
    }>(
      `cartao:imagem:${imageKey}`,
      () => this.blobService.getFile(imageKey, this.env.get('BUCKET_CARTAO')),
      TTL_IMAGEM_DO_CARTAO_MS,
    );

    return {
      buffer: Buffer.from(arquivo.buffer, 'base64'),
      contentType: arquivo.contentType || 'image/jpeg',
      nomeDoArquivo: imageKey.split('/').pop() || `cartao-${historicoId}.jpg`,
    };
  }
}

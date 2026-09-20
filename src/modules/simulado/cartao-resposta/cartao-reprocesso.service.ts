import { Inject, Injectable, Logger } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { v4 as uuidv4 } from 'uuid';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { CartaoRespostaHttpService } from './cartao-resposta-http.service';
import { OmrCacheService } from './omr-cache.service';
import { decodeCartaoQr } from './qr-decoder';

@Injectable()
export class CartaoReprocessoService {
  private readonly logger = new Logger(CartaoReprocessoService.name);

  constructor(
    @Inject('BlobService')
    private readonly blobService: BlobService,
    private readonly omrCache: OmrCacheService,
    private readonly cartaoHttp: CartaoRespostaHttpService,
    private readonly env: EnvService,
    private readonly cursinhoResolver: CursinhoResolverService,
  ) {}

  /**
   * Troca a foto (ou só pede nova tentativa) de um cartão que falhou.
   *
   * ⚠️ **Chave NOVA a cada troca, nunca a do histórico.** O ms-omr lê a imagem
   * com cache-first e recarimba a chave com TTL de até 3600s; reusar a chave
   * faria uma tentativa nova poder ler a foto velha por até uma hora, e o
   * `primeImagem` **engole erro e só loga**, então nem regravar o cache
   * resolveria de forma confiável. Chave inédita nunca esteve lá.
   */
  async processar(
    colaboradorUserId: string,
    historicoId: string,
    file?: Express.Multer.File,
  ): Promise<void> {
    // ⚠️ Do JWT, nunca do corpo. Mesmo padrão do `CartaoUploadService`.
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    if (!file?.buffer) {
      // Caminho do `reprocessar`: a foto serve, quem falhou foi a infra.
      await this.cartaoHttp.reprocessar(historicoId, { cursinhoId });
      return;
    }

    const { simuladoId, cartaoCode } = await decodeCartaoQr(file.buffer);
    const imageKey = `cartoes/${simuladoId}/${uuidv4()}.jpg`;

    // ⚠️ Bucket ANTES do cache: se o cache falhar, o OMR busca do bucket, que
    // já tem a foto certa. Invertido, o cache vira a fonte da verdade.
    await this.blobService.putObjectAtKey(
      file.buffer,
      this.env.get('BUCKET_CARTAO'),
      imageKey,
      file.mimetype ?? 'image/jpeg',
    );
    await this.omrCache.primeImagem(imageKey, file.buffer);

    try {
      // ⚠️ O ms confere se o QR é do MESMO cartão — é lá que o histórico está.
      await this.cartaoHttp.reprocessar(historicoId, {
        cursinhoId,
        imageKey,
        simuladoId,
        cartaoCode,
      });
    } catch (err) {
      // ⚠️ Órfã assumida: o bucket já foi escrito. O vizinho `CartaoUploadService`
      // resolve o vínculo "ANTES de tocar no bucket" justamente para não deixar
      // lixo lá; aqui **não dá** — quem decide se a tentativa vale (status,
      // rate limit, QR do mesmo cartão) é o ms, e o ms só decide depois de a
      // imagem existir. Uma recusa deixa o arquivo para trás. É uma imagem
      // perdida quando um humano escolhe o arquivo errado — mais barato que uma
      // ida extra ou uma escrita em duas fases. Mas **logar**, para não virar
      // crescimento silencioso.
      this.logger.warn(
        `imagem ${imageKey} ficou órfã no bucket: o reprocessamento de ${historicoId} foi recusado`,
      );
      throw err;
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CartaoRespostaHttpService } from './cartao-resposta-http.service';
import { OmrCacheService } from './omr-cache.service';
import { decodeCartaoQr } from './qr-decoder';

@Injectable()
export class CartaoUploadService {
  constructor(
    @Inject('BlobService')
    private readonly blobService: BlobService,
    private readonly omrCache: OmrCacheService,
    private readonly cartaoHttp: CartaoRespostaHttpService,
    private readonly env: EnvService,
  ) {}

  async processar(
    usuario: string,
    file: Express.Multer.File,
  ): Promise<{ historicoId: string }> {
    const { simuladoId, cartaoCode } = await decodeCartaoQr(file.buffer);
    const imageKey = `cartoes/${simuladoId}/${uuidv4()}.jpg`;

    await this.blobService.putObjectAtKey(
      file.buffer,
      this.env.get('BUCKET_CARTAO'),
      imageKey,
      file.mimetype ?? 'image/jpeg',
    );
    await this.omrCache.primeImagem(imageKey, file.buffer);

    return this.cartaoHttp.criarHistorico({ usuario, imageKey, cartaoCode });
  }
}

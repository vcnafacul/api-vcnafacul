import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
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
    private readonly cursinhoResolver: CursinhoResolverService,
    private readonly studentCourseRepository: StudentCourseRepository,
  ) {}

  async processar(
    colaboradorUserId: string,
    usuario: string,
    file: Express.Multer.File,
  ): Promise<{ historicoId: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('arquivo do cartão é obrigatório');
    }

    // Resolvido ANTES de tocar no bucket: recusar depois deixaria a imagem órfã lá.
    const { cursinhoId, turmaId } = await this.resolverVinculo(
      colaboradorUserId,
      usuario,
    );

    const { simuladoId, cartaoCode } = await decodeCartaoQr(file.buffer);
    const imageKey = `cartoes/${simuladoId}/${uuidv4()}.jpg`;

    await this.blobService.putObjectAtKey(
      file.buffer,
      this.env.get('BUCKET_CARTAO'),
      imageKey,
      file.mimetype ?? 'image/jpeg',
    );
    await this.omrCache.primeImagem(imageKey, file.buffer);

    return this.cartaoHttp.criarHistorico({
      usuario,
      imageKey,
      cartaoCode,
      cursinhoId,
      turmaId,
    });
  }

  /**
   * O cursinho vem de QUEM ENVIA, pelo JWT — nunca do corpo da requisição. A turma
   * vem do estudante naquele instante, e é o que congela o relatório numa data.
   *
   * Buscar o estudante escopado no cursinho também fecha uma falha antiga: antes
   * disto, o `usuario` do corpo era aceito sem conferir a que cursinho ele pertencia.
   */
  private async resolverVinculo(
    colaboradorUserId: string,
    usuario: string,
  ): Promise<{ cursinhoId: string; turmaId?: string }> {
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);
    const student =
      await this.studentCourseRepository.findByUserIdAndPrepCourse(
        usuario,
        cursinhoId,
      );
    if (!student) {
      throw new ForbiddenException('estudante não pertence ao seu cursinho');
    }
    return { cursinhoId, turmaId: student.class?.id };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { CartaoRespostaHttpService } from './cartao-resposta-http.service';
import { OmrCacheService } from './omr-cache.service';
import { prepararFotoDoCartao } from './qr-decoder';

@Injectable()
export class CartaoUploadService {
  private readonly logger = new Logger(CartaoUploadService.name);

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
      throw new BadRequestException('Envie a foto do cartão.');
    }

    // Resolvido ANTES de tocar no bucket: recusar depois deixaria a imagem órfã lá.
    const { cursinhoId, turmaId } = await this.resolverVinculo(
      colaboradorUserId,
      usuario,
    );

    // tickets/037: a foto sai daqui EM PÉ — é ela que vai para o bucket, para o cache do
    // ms-omr e para o "Baixar foto do cartão". Deitada, o OMR lia letras trocadas sem aviso.
    const foto = await prepararFotoDoCartao(file.buffer, file.mimetype);
    const { simuladoId, cartaoCode } = foto;
    const imageKey = `cartoes/${simuladoId}/${uuidv4()}.jpg`;
    if (foto.rotacao !== 0) {
      this.logger.log(
        `foto do cartão girada ${foto.rotacao}° para ficar em pé (${imageKey})`,
      );
    }

    await this.blobService.putObjectAtKey(
      foto.buffer,
      this.env.get('BUCKET_CARTAO'),
      imageKey,
      foto.contentType,
    );
    await this.omrCache.primeImagem(imageKey, foto.buffer);

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
      throw new ForbiddenException('Este estudante não é do seu cursinho.');
    }
    return { cursinhoId, turmaId: student.class?.id };
  }
}

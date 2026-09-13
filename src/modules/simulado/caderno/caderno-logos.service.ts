import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';

// sharp usa `export =` (module.exports = sharp). A resolução de TIPOS do sharp
// diverge entre ambientes (ver o comentário no `qr-decoder.ts`) → import dá
// TS2349 no CI. `require` puro compila em qualquer layout e no runtime
// module.exports já é a função.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

/** A chave fixa do logo do Você na Facul dentro do `BUCKET_HOME`. */
const CHAVE_LOGO_VNF = 'logo.png';

/**
 * Um dia, igual ao cache que o `PartnerPrepCourseService.getLogo` já usa.
 * Governa só o logo do VNF: o do cursinho é cacheado lá dentro do `getLogo`.
 */
const TTL_LOGO_VNF = 60 * 60 * 24 * 1000;

/**
 * O 404 do `getByUserId` é o estado NORMAL de quem não é de cursinho —
 * `visualizarProvas` não exige vínculo (ver o docblock da classe). Não há
 * cadastro a corrigir, então isso não é incidente.
 *
 * ⚠️ Só vale para o ramo do cursinho. O `s3Service.getFile` traduz o
 * `NoSuchKey` do S3 para o MESMO `HttpException(NOT_FOUND)`, e ali o 404
 * significa `logo.png` fora do bucket — erro de configuração, que precisa
 * gritar. Por isso a expectativa é por ramo, não pelo status.
 */
const ehUsuarioSemCursinho = (erro: unknown) =>
  erro instanceof HttpException && erro.getStatus() === HttpStatus.NOT_FOUND;

export interface LogosDoCaderno {
  vnf?: Buffer;
  cursinho?: Buffer;
}

/**
 * Resolve os dois logos que o template do caderno referencia.
 *
 * ⚠️ **Nenhuma falha aqui pode derrubar o download.** O caderno é liberado por
 * `visualizarProvas`, que não exige ser colaborador de cursinho nenhum — e o
 * `getByUserId` lança 404 para quem não tem. Deixar a exceção subir tiraria a
 * feature de quem hoje consegue usá-la. Toda falha vira ausência do logo, que
 * o ms-simulado traduz num `% AVISO:` visível no Overleaf.
 *
 * Separado do `CadernoHttpService` de propósito: aquele fala HTTP com o
 * ms-simulado, este resolve bytes em bucket.
 */
@Injectable()
export class CadernoLogosService {
  private readonly logger = new Logger(CadernoLogosService.name);

  constructor(
    private readonly blobService: BlobService,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private readonly envService: EnvService,
    private readonly cache: CacheService,
  ) {}

  async resolver(userId: string): Promise<LogosDoCaderno> {
    const [vnf, cursinho] = await Promise.all([
      this.semQuebrar('vnf', () => this.buscarVnf()),
      this.semQuebrar(
        'cursinho',
        () => this.buscarCursinho(userId),
        ehUsuarioSemCursinho,
      ),
    ]);

    const logos: LogosDoCaderno = {};
    if (vnf) logos.vnf = vnf;
    if (cursinho) logos.cursinho = cursinho;
    return logos;
  }

  /**
   * O `try` envolve cada busca por dentro, não o `Promise.all` por fora: assim
   * nenhuma das duas promises chega a rejeitar e a falha de uma não cancela o
   * resultado da outra.
   */
  private async semQuebrar(
    rotulo: string,
    buscar: () => Promise<Buffer | undefined>,
    ehEsperado: (erro: unknown) => boolean = () => false,
  ): Promise<Buffer | undefined> {
    try {
      return await buscar();
    } catch (erro) {
      // `?.` e o fallback: um `Promise.reject()` sem argumento rejeita com
      // `undefined`, e ler `.message` dele lançaria de dentro do próprio
      // `catch` — a exceção escaparia justamente por aqui.
      const msg = `logo ${rotulo} não resolvido: ${(erro as Error)?.message ?? erro}`;
      // Falha esperada não vai para `error`: se o 404 de quem não tem cursinho
      // saísse no mesmo nível e formato do bucket fora, o incidente real
      // ficaria enterrado no meio do ruído. O que sobra em `error` é o que
      // merece investigação.
      if (ehEsperado(erro)) this.logger.log(msg);
      else this.logger.error(msg);
      return undefined;
    }
  }

  private async buscarVnf(): Promise<Buffer | undefined> {
    // ⚠️ O que entra no cache é o base64, e a conversão vem DEPOIS de propósito.
    // Cachear o `Buffer` já convertido parece a otimização óbvia e seria um bug:
    // o cache é Keyv/Redis, então o `Buffer` volta serializado como
    // `{"type":"Buffer","data":[…]}` e o `sharp` receberia lixo. O round-trip do
    // `sharp` num PNG custa ~0,5 ms — irrelevante perto de gerar o ZIP LaTeX.
    const arquivo = await this.cache.wrap<{
      buffer: string;
      contentType: string;
    }>(
      'caderno:logo-vnf',
      async () =>
        await this.blobService.getFile(
          CHAVE_LOGO_VNF,
          this.envService.get('BUCKET_HOME'),
        ),
      TTL_LOGO_VNF,
    );
    return await this.paraPng(arquivo?.buffer);
  }

  private async buscarCursinho(userId: string): Promise<Buffer | undefined> {
    // Lança 404 quando o usuário não tem cursinho — tratado pelo `semQuebrar`.
    const partner = await this.partnerPrepCourseService.getByUserId(userId);
    // `getLogo` já tem cache de um dia, chave `partner:logo:<id>`.
    const arquivo = await this.partnerPrepCourseService.getLogo(partner.id);
    return await this.paraPng(arquivo?.buffer);
  }

  /**
   * ⚠️ A conversão não é defensividade gratuita: o `updateLogo` do cursinho
   * não valida tipo de arquivo nenhum, então os bytes podem ser jpg, webp ou
   * svg. Dentro de um arquivo chamado `logo_cursinho.png` isso quebra a
   * compilação — o pdflatex escolhe o leitor pela extensão.
   */
  private async paraPng(base64?: string | null): Promise<Buffer | undefined> {
    if (!base64) return undefined;
    const bruto = Buffer.from(base64, 'base64');
    if (bruto.length === 0) return undefined;
    return await sharp(bruto).png().toBuffer();
  }
}

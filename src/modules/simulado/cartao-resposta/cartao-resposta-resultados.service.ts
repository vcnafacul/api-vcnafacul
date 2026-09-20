import { Injectable, NotFoundException } from '@nestjs/common';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { HistoricoService } from '../historico/historico.service';

@Injectable()
export class CartaoRespostaResultadosService {
  constructor(
    private readonly cursinhoResolver: CursinhoResolverService,
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly historicoService: HistoricoService,
  ) {}

  /**
   * Quantos estudantes o autocomplete devolve.
   *
   * ⚠️ Teto, não página: o campo é para achar UMA pessoa. Se dez não bastam, o
   * termo é curto demais, e paginar uma lista de sugestões só adiaria a
   * decisão de digitar mais uma letra.
   */
  static readonly LIMITE_DA_BUSCA = 10;

  /** Abaixo disto a busca nem sai do client — espelhado lá. */
  static readonly MINIMO_DE_CARACTERES = 3;

  /**
   * Busca estudantes do cursinho DO COLABORADOR por matrícula ou nome.
   *
   * ⚠️ O `cursinhoId` sai do JWT, nunca da requisição. É o que impede um
   * colaborador de enxergar — e mandar cartão para — estudante de outro
   * cursinho ao digitar um nome comum.
   *
   * ⚠️ **Não devolve histórico.** A busca serve para escolher para quem o
   * cartão vai; os resultados anteriores do estudante são outra tela.
   */
  async buscarEstudantes(colaboradorUserId: string, termo: string) {
    const limpo = (termo ?? '').trim();
    // ⚠️ Termo curto devolve lista VAZIA, e não erro: é o estado normal de
    // quem ainda está digitando, e um 400 aqui viraria toast a cada tecla.
    if (limpo.length < CartaoRespostaResultadosService.MINIMO_DE_CARACTERES) {
      return { estudantes: [] };
    }

    const prepCourseId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    const encontrados =
      await this.studentCourseRepository.buscarParaEnvioDeCartao(
        limpo,
        prepCourseId,
        CartaoRespostaResultadosService.LIMITE_DA_BUSCA,
      );

    return {
      estudantes: encontrados.map((s) => {
        const u = s.user;
        return {
          userId: u.id,
          nome:
            u.useSocialName && u.socialName
              ? u.socialName
              : `${u.firstName} ${u.lastName}`,
          matricula: s.cod_enrolled,
          // ⚠️ `null`, e não string vazia: estudante sem turma é caso real no
          // relatório geral do cursinho, e a tela decide como mostrar.
          turma: s.class?.name ?? null,
        };
      }),
    };
  }

  async buscarPorMatricula(colaboradorUserId: string, matricula: string) {
    const prepCourseId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    const student =
      await this.studentCourseRepository.findByEnrollmentCodeAndPrepCourse(
        matricula,
        prepCourseId,
      );
    if (!student) {
      throw new NotFoundException('estudante não encontrado nesse cursinho');
    }

    const resultado = await this.historicoService.getAllByUser(
      { limit: 10 } as any,
      student.user.id,
    );

    const u = student.user;
    const nome =
      u.useSocialName && u.socialName
        ? u.socialName
        : `${u.firstName} ${u.lastName}`;

    return {
      estudante: {
        userId: student.user.id,
        nome,
        matricula: student.cod_enrolled,
      },
      historicos: (resultado as { data?: unknown[] })?.data ?? [],
    };
  }
}

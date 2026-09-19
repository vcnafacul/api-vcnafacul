import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassRepository } from 'src/modules/prepCourse/class/class.repository';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import {
  LinhaDoRelatorioDtoOutput,
  RelatorioDtoOutput,
} from './dtos/relatorio.dto.output';
import { RelatorioHttpService } from './relatorio-http.service';

interface LinhaDoMs {
  usuario: string;
  turmaId?: string;
  historicoId?: string;
  status?: string;
  cartaoCode?: string;
  questoesRespondidas?: number;
  aproveitamentoGeral?: number;
  falha?: Record<string, unknown>;
}

@Injectable()
export class RelatorioService {
  constructor(
    private readonly http: RelatorioHttpService,
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly classRepository: ClassRepository,
    private readonly cursinhoResolver: CursinhoResolverService,
  ) {}

  async consultar(
    colaboradorUserId: string,
    simuladoId: string,
    turmaId?: string,
  ): Promise<RelatorioDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);

    const [estudantes, doMs] = await Promise.all([
      this.studentCourseRepository.findEnrolledForRelatorio(
        cursinhoId,
        turmaId,
      ),
      this.http.buscarLinhas(simuladoId, cursinhoId, turmaId) as Promise<{
        linhas: LinhaDoMs[];
        totalEstudantesComCartaoNoCursinho: number;
      }>,
    ]);

    const porUsuario = new Map(doMs.linhas.map((l) => [l.usuario, l]));
    const usuariosAtivos = new Set(estudantes.map((e: any) => e.userId));

    // A lista parte dos ESTUDANTES: quem não enviou some se partir das linhas,
    // e saber quem falta é metade do valor do relatório para quem coordena.
    const linhas = estudantes.map((e: any) =>
      this.montarLinha(e, porUsuario.get(e.userId)),
    );

    const comLeitura = linhas.filter(
      (l) => l.aproveitamentoGeral !== undefined,
    );

    return {
      linhas,
      resumo: {
        totalNoRecorte: linhas.length,
        comLeituraConcluida: comLeitura.length,
        // null, não zero: zero é uma nota, ausência de leitura não é
        aproveitamentoGeral: comLeitura.length
          ? comLeitura.reduce((s, l) => s + l.aproveitamentoGeral!, 0) /
            comLeitura.length
          : null,
        totalEstudantesComCartaoNoCursinho:
          doMs.totalEstudantesComCartaoNoCursinho,
        temEstudanteSemTurma: linhas.some((l) => l.turmaId === null),
        // quem saiu do cursinho depois de enviar: contado, nunca listado
        linhasSemEstudanteAtivo: doMs.linhas.filter(
          (l) => !usuariosAtivos.has(l.usuario),
        ).length,
      },
    };
  }

  /** Proxy puro: o agregado por questão não tem dado de estudante. */
  async consultarQuestoes(
    colaboradorUserId: string,
    simuladoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);
    return this.http.buscarQuestoes(simuladoId, cursinhoId, turmaId);
  }

  /**
   * O cursinho vem SEMPRE do JWT, nunca da URL.
   *
   * ⚠️ O 403 da turma não é contra vazamento — a consulta de estudantes já é
   * escopada no cursinho, então aluno de fora nunca volta. É honestidade: sem
   * ele, pedir uma turma que não é sua devolve lista **vazia**, indistinguível
   * de "turma sua, ninguém matriculado".
   */
  private async resolverEscopo(
    colaboradorUserId: string,
    turmaId?: string,
  ): Promise<string> {
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    if (turmaId !== undefined) {
      const turma = await this.classRepository.findOneByIdWithPartner(turmaId);
      if (!turma || turma.partnerPrepCourse?.id !== cursinhoId) {
        throw new ForbiddenException('turma não pertence ao seu cursinho');
      }
    }

    return cursinhoId;
  }

  private montarLinha(e: any, doMs?: LinhaDoMs): LinhaDoRelatorioDtoOutput {
    const u = e.user;
    const nome =
      u?.useSocialName && u?.socialName
        ? u.socialName
        : `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();

    return {
      usuario: e.userId,
      nome,
      matricula: e.cod_enrolled,
      turmaId: e.class?.id ?? null,
      turmaNome: e.class?.name ?? null,
      enviouCartao: doMs !== undefined,
      historicoId: doMs?.historicoId,
      status: doMs?.status,
      cartaoCode: doMs?.cartaoCode,
      questoesRespondidas: doMs?.questoesRespondidas,
      aproveitamentoGeral: doMs?.aproveitamentoGeral,
      falha: doMs?.falha,
    };
  }
}

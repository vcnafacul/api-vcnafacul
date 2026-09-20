import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassRepository } from 'src/modules/prepCourse/class/class.repository';
import { StudentCourse } from 'src/modules/prepCourse/studentCourse/student-course.entity';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { DetalheDoEstudanteDtoOutput } from './dtos/detalhe-do-estudante.dto.output';
import { QuestoesDoRelatorioDtoOutput } from './dtos/questoes-do-relatorio.dto.output';
import {
  LinhaDoRelatorioDtoOutput,
  RelatorioDtoOutput,
} from './dtos/relatorio.dto.output';
import { SimuladosComCartaoDtoOutput } from './dtos/simulados-com-cartao.dto.output';
import { RelatorioHttpService } from './relatorio-http.service';

interface LinhaDoMs {
  usuario: string;
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
    const usuariosAtivos = new Set(estudantes.map((e) => e.userId));

    // A lista parte dos ESTUDANTES: quem não enviou some se partir das linhas,
    // e saber quem falta é metade do valor do relatório para quem coordena.
    const linhas = estudantes.map((e) =>
      this.montarLinha(e, porUsuario.get(e.userId)),
    );

    // ⚠️ Gate no STATUS, não só na presença da nota. O `marcarFalha` do ms não
    // limpa `aproveitamento`, então um cartão que leu bem e depois falhou no
    // reprocessamento continua carregando a nota velha. A aba de questões
    // filtra por `status: completed` no ms — inferir pela nota aqui faria as
    // duas metades da mesma tela discordarem.
    //
    // Literal, não enum: `HistoricoStatus` vive só no repo do ms-simulado,
    // que não é importável daqui (repositório separado).
    const comLeitura = linhas.filter(
      (l) =>
        l.status === 'completed' && typeof l.aproveitamentoGeral === 'number',
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
  ): Promise<QuestoesDoRelatorioDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);
    return this.http.buscarQuestoes(
      simuladoId,
      cursinhoId,
      turmaId,
    ) as Promise<QuestoesDoRelatorioDtoOutput>;
  }

  /**
   * Proxy puro: nenhuma hidratação. Esta rota devolve simulados, não pessoas,
   * então o MySQL não entra. O `resolverEscopo` é o MESMO do relatório — é
   * ele que resolve o cursinho pelo JWT e recusa turma de outro cursinho.
   */
  async listarSimulados(
    colaboradorUserId: string,
    turmaId?: string,
  ): Promise<SimuladosComCartaoDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);
    return this.http.buscarSimulados(
      cursinhoId,
      turmaId,
    ) as Promise<SimuladosComCartaoDtoOutput>;
  }

  /**
   * Proxy puro. O `resolverEscopo` é o MESMO do relatório — sem turma, porque
   * o estudante já é identificado e o `cursinhoId` do JWT é o gate.
   *
   * O nome do estudante não é buscado aqui: a tela que abre o detalhe já o tem
   * na linha que foi clicada, e o MySQL repetiria o que está em mãos.
   */
  async consultarDetalhe(
    colaboradorUserId: string,
    simuladoId: string,
    userId: string,
  ): Promise<DetalheDoEstudanteDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId);
    return this.http.buscarDetalheDoEstudante(
      simuladoId,
      userId,
      cursinhoId,
    ) as Promise<DetalheDoEstudanteDtoOutput>;
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

  private montarLinha(
    e: StudentCourse,
    doMs?: LinhaDoMs,
  ): LinhaDoRelatorioDtoOutput {
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

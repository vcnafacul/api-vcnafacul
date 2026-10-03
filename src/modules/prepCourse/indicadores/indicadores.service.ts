import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { CoursePeriod } from '../coursePeriod/course-period.entity';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import {
  CalculoDosIndicadores,
  estavaCancelado,
} from './calculo-dos-indicadores';
import { diaDoPeriodo, diaEmSaoPaulo, diasEntre, fimDoDia } from './datas';
import {
  AlunoSumindoDtoOutput,
  IndicadoresDtoOutput,
  PeriodoDoIndicadorDtoOutput,
  PeriodosDoCursinhoDtoOutput,
  ResumoDosIndicadoresDtoOutput,
} from './dtos/indicadores.dto.output';
import { IndicadoresRepository } from './indicadores.repository';
import { Metricas, somarMetricas, VERSAO_DAS_METRICAS } from './metricas';

const MINUTO = 60 * 1000;
/** Período aberto: os números mudam ao longo do dia. */
const CACHE_ABERTO = 10 * MINUTO;
/** Período encerrado: só muda com backfill. */
const CACHE_ENCERRADO = 60 * MINUTO;

export const chaveDoCache = (periodoId: string) => `indicadores:${periodoId}`;

@Injectable()
export class IndicadoresService {
  private readonly logger = new Logger(IndicadoresService.name);

  constructor(
    private readonly repository: IndicadoresRepository,
    private readonly calculo: CalculoDosIndicadores,
    private readonly partnerRepository: PartnerPrepCourseRepository,
    private readonly cache: CacheService,
  ) {}

  /** O cursinho vem sempre do colaborador logado, nunca de parâmetro. */
  private async cursinhoDe(userId: string): Promise<string> {
    const cursinho = await this.partnerRepository.findOneByUserId(userId);
    if (!cursinho) throw new NotFoundException('Cursinho não encontrado');
    return cursinho.id;
  }

  async periodos(userId: string): Promise<PeriodosDoCursinhoDtoOutput> {
    const cursinhoId = await this.cursinhoDe(userId);
    const [periodos, turmasSemPeriodo] = await Promise.all([
      this.repository.periodosDoCursinho(cursinhoId),
      this.repository.turmasSemPeriodo(cursinhoId),
    ]);
    const hoje = diaEmSaoPaulo();
    return {
      periodos: periodos.map((p) => paraSaida(p, hoje)),
      turmasSemPeriodo,
    };
  }

  async obter(
    periodoId: string,
    userId: string,
  ): Promise<IndicadoresDtoOutput> {
    const cursinhoId = await this.cursinhoDe(userId);
    const periodo = await this.repository.periodoDoCursinho(
      periodoId,
      cursinhoId,
    );
    if (!periodo) throw new NotFoundException('Período letivo não encontrado');

    const saida = paraSaida(periodo, diaEmSaoPaulo());
    return this.cache.wrap(
      chaveDoCache(periodoId),
      () => this.montar(periodo, saida),
      saida.emAndamento ? CACHE_ABERTO : CACHE_ENCERRADO,
    );
  }

  /**
   * Os números do período em andamento para a dashboard (card 10) — a mesma
   * conta e o mesmo cache da tela. Mais de um período aberto (ex.: extensivo
   * e semiextensivo): soma. Nenhum, ou a pessoa não é de um cursinho: lista
   * vazia e `metricas: null` — um `null` puro chegaria como corpo vazio.
   */
  async resumo(userId: string): Promise<ResumoDosIndicadoresDtoOutput> {
    const cursinho = await this.partnerRepository.findOneByUserId(userId);
    if (!cursinho) return { cursinho: false, periodos: [], metricas: null };
    const nenhum = { cursinho: true, periodos: [], metricas: null };
    const hoje = diaEmSaoPaulo();
    const abertos = (await this.repository.periodosDoCursinho(cursinho.id))
      .map((p) => paraSaida(p, hoje))
      .filter((p) => p.emAndamento);
    if (abertos.length === 0) return nenhum;
    const indicadores = await Promise.all(
      abertos.map((p) => this.obter(p.id, userId)),
    );
    return {
      cursinho: true,
      periodos: abertos.map((p) => ({ id: p.id, nome: p.nome })),
      metricas: somarMetricas(indicadores.map((i) => i.cursinho)),
    };
  }

  /**
   * Quem está sumindo hoje, com nome — por isso fora do snapshot e sem cache
   * compartilhado. Período encerrado: lista vazia (não há o que fazer).
   * O telefone só vai para quem pode gerenciar estudantes (R7).
   */
  async sumindo(
    periodoId: string,
    userId: string,
  ): Promise<AlunoSumindoDtoOutput[]> {
    const cursinhoId = await this.cursinhoDe(userId);
    const periodo = await this.repository.periodoDoCursinho(
      periodoId,
      cursinhoId,
    );
    if (!periodo) throw new NotFoundException('Período letivo não encontrado');
    if (!paraSaida(periodo, diaEmSaoPaulo()).emAndamento) return [];

    const turmas = await this.repository.turmasDoPeriodo(periodo.id);
    if (turmas.length === 0) return [];
    const hoje = diaEmSaoPaulo();
    const alunos = await this.calculo.alunosDasTurmas(
      turmas.map((t) => t.id),
      fimDoDia(hoje),
    );
    const sumindo = await this.calculo.sumindoDasTurmas(
      alunos.filter((a) => !estavaCancelado(a)),
      hoje,
    );
    if (sumindo.length === 0) return [];

    const [dados, podeVerTelefone] = await Promise.all([
      this.repository.contatosDosAlunos(sumindo.map((s) => s.alunoId)),
      this.repository.podeGerenciarEstudantes(userId),
    ]);
    const nomeDaTurma = new Map(turmas.map((t) => [t.id, t.nome]));
    return sumindo
      .map((s) => {
        const d = dados.get(s.alunoId);
        return {
          alunoId: s.alunoId,
          nome: d?.nome ?? '',
          turma: nomeDaTurma.get(s.turmaId) ?? '',
          ultimaPresenca: s.ultimaPresenca,
          faltasSeguidas: s.faltasSeguidas,
          ...(podeVerTelefone ? { telefone: d?.telefone ?? null } : {}),
        };
      })
      .sort(
        (a, b) =>
          b.faltasSeguidas - a.faltasSeguidas || a.nome.localeCompare(b.nome),
      );
  }

  /**
   * Período em andamento: calcula hoje ao vivo. Encerrado (ou ainda não
   * começado): calcula no último dia que importa — o fim, ou hoje se ainda
   * não chegou nele. Com o cálculo por data dos eventos, esse número é o mesmo
   * que a foto do último dia, e não depende de o cron ter rodado.
   */
  private async montar(
    periodo: CoursePeriod,
    saida: PeriodoDoIndicadorDtoOutput,
  ): Promise<IndicadoresDtoOutput> {
    const turmas = await this.repository.turmasDoPeriodo(periodo.id);
    const hoje = diaEmSaoPaulo();
    // dentro do período: hoje; encerrado: o último dia; ainda não começou: o
    // primeiro (antes dele não há nada para mostrar)
    const referencia =
      hoje > saida.fim ? saida.fim : hoje < saida.inicio ? saida.inicio : hoje;
    const metricas = await this.calculo.calcular(
      turmas.map((t) => t.id),
      referencia,
    );

    const porTurma = turmas.map((t) => ({
      id: t.id,
      nome: t.nome,
      metricas: metricas.get(t.id) ?? {},
    }));
    const cursinho = somarMetricas(porTurma.map((t) => t.metricas));

    const linhas = await this.repository.serieDoPeriodo(
      periodo.id,
      turmas.map((t) => t.id),
    );
    const porDia = new Map<string, Metricas[]>();
    for (const l of linhas) {
      const dia = String(l.dia).slice(0, 10);
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia).push(l.metricas);
    }
    // o ponto de hoje é o calculado agora, e não a foto (que só sai às 23h40)
    porDia.set(referencia, [cursinho]);
    const serie = [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, lista]) => ({ dia, metricas: somarMetricas(lista) }));

    return {
      periodo: saida,
      atualizadoEm: new Date().toISOString(),
      cursinho,
      turmas: porTurma,
      serie,
    };
  }

  /**
   * Grava a foto de `dia` de cada turma dos períodos que cobrem o dia. Usado
   * pelo cron (hoje) e pelo backfill (dias passados).
   *
   * @returns quantas turmas foram gravadas
   */
  async gravarDia(dia: string, opcoes: { periodoId?: string } = {}) {
    // A janela do banco é folgada (as datas do período são meia-noite UTC); o
    // corte exato é pelo dia, logo abaixo.
    const vespera = new Date(`${dia}T00:00:00Z`);
    vespera.setUTCDate(vespera.getUTCDate() - 1);
    const periodos = (
      await this.repository.periodosQueCobrem(vespera, fimDoDia(dia))
    ).filter(
      (p) =>
        (!opcoes.periodoId || p.id === opcoes.periodoId) &&
        diaDoPeriodo(p.startDate) <= dia &&
        dia <= diaDoPeriodo(p.endDate),
    );

    let gravadas = 0;
    for (const periodo of periodos) {
      try {
        const turmas = await this.repository.turmasDoPeriodo(periodo.id);
        const metricas = await this.calculo.calcular(
          turmas.map((t) => t.id),
          dia,
        );
        await this.repository.gravar(
          turmas.map((t) => ({
            dia,
            partnerPrepCourseId: periodo.partnerPrepCourseId,
            coursePeriodId: periodo.id,
            classId: t.id,
            metricas: metricas.get(t.id) ?? {},
            versao: VERSAO_DAS_METRICAS,
          })),
        );
        gravadas += turmas.length;
        await this.cache.del(chaveDoCache(periodo.id));
      } catch (e) {
        // uma turma (ou período) com erro não pode parar as outras
        this.logger.error(
          `Indicadores de ${dia} do período ${periodo.id}: ${e?.message}`,
        );
      }
    }
    return gravadas;
  }

  /** Todos os dias de um período, do início até hoje (ou o fim). */
  diasDoPeriodo(periodo: CoursePeriod) {
    const hoje = diaEmSaoPaulo();
    const fim = diaDoPeriodo(periodo.endDate);
    return diasEntre(diaDoPeriodo(periodo.startDate), fim < hoje ? fim : hoje);
  }
}

function paraSaida(p: CoursePeriod, hoje: string): PeriodoDoIndicadorDtoOutput {
  const inicio = diaDoPeriodo(p.startDate);
  const fim = diaDoPeriodo(p.endDate);
  return {
    id: p.id,
    nome: p.name,
    ano: p.year,
    inicio,
    fim,
    emAndamento: inicio <= hoje && hoje <= fim,
  };
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { RelatorioHttpService } from 'src/modules/simulado/relatorio/relatorio-http.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { EntityManager, In } from 'typeorm';
import { ClassEssaySnapshot } from '../class/essay-analytics/class-essay-snapshot.entity';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { diaDoPeriodo, diaEmSaoPaulo } from './datas';
import {
  AplicacaoDtoOutput,
  DesempenhoDtoOutput,
  MesDeDesempenhoDtoOutput,
} from './dtos/desempenho.dto.output';
import { IndicadoresRepository } from './indicadores.repository';

const HORA = 60 * 60 * 1000;

/** O que o ms devolve por simulado (ms-simulado#252). */
interface SimuladoDoRecorte {
  simuladoId: string;
  nome: string | null;
  comLeituraConcluida: number;
  primeiroEnvio?: string | null;
  mediaAproveitamento?: number | null;
}

/** 0..1 → 0..100 com uma casa. */
const pct = (fracao: number | null | undefined) =>
  typeof fracao === 'number' ? Math.round(fracao * 1000) / 10 : null;

/**
 * Como o desempenho evoluiu (tickets/033, card 09). Duas visões, porque
 * medem coisas diferentes (R8):
 *
 * 1. **Simulados aplicados pelo cursinho (cartão)** — a turma toda faz a
 *    mesma prova, então a média de uma aplicação compara com a outra.
 * 2. **Por mês** — simulados (participação e média) e redação (corrigidas e
 *    nota), dos snapshots mensais por turma que já existem. O simulado online
 *    é voluntário: a média mensal é apoio, não curva de evolução.
 *
 * Fora do snapshot diário (já há snapshot mensal) e com cache de 1 h: são
 * chamadas ao ms.
 */
@Injectable()
export class DesempenhoService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly repository: IndicadoresRepository,
    private readonly partnerRepository: PartnerPrepCourseRepository,
    private readonly relatorio: RelatorioHttpService,
    private readonly simuladoHttp: SimuladoHttpService,
    private readonly cache: CacheService,
  ) {}

  async obter(periodoId: string, userId: string): Promise<DesempenhoDtoOutput> {
    const cursinho = await this.partnerRepository.findOneByUserId(userId);
    if (!cursinho) throw new NotFoundException('Cursinho não encontrado');
    const periodo = await this.repository.periodoDoCursinho(
      periodoId,
      cursinho.id,
    );
    if (!periodo) throw new NotFoundException('Período letivo não encontrado');

    return this.cache.wrap(
      `indicadores:desempenho:${periodoId}`,
      async () => {
        const turmas = await this.repository.turmasDoPeriodo(periodo.id);
        const usuarios = await this.repository.usuariosDasTurmas(
          turmas.map((t) => t.id),
        );
        const inicio = diaDoPeriodo(periodo.startDate).slice(0, 7);
        const fim = [diaDoPeriodo(periodo.endDate), diaEmSaoPaulo()]
          .sort()[0]
          .slice(0, 7);

        const [aplicacoes, porTurma, porMes] = await Promise.all([
          this.aplicacoes(
            cursinho.id,
            usuarios.map((u) => u.userId),
          ),
          Promise.all(
            turmas.map(async (t) => {
              const daTurma = usuarios
                .filter((u) => u.turmaId === t.id)
                .map((u) => u.userId);
              const lista = await this.aplicacoes(cursinho.id, daTurma);
              const ultima = [...lista].reverse().find((a) => a.media !== null);
              return {
                turmaId: t.id,
                ultimaAplicacao: ultima
                  ? { nome: ultima.nome, media: ultima.media }
                  : null,
              };
            }),
          ),
          this.porMes(
            turmas.map((t) => t.id),
            inicio,
            fim,
          ),
        ]);
        return { aplicacoes, porTurma, porMes };
      },
      HORA,
    );
  }

  /** Aplicações por cartão dos alunos dados, da mais antiga à mais nova. */
  private async aplicacoes(
    cursinhoId: string,
    usuarios: string[],
  ): Promise<AplicacaoDtoOutput[]> {
    // ⚠️ lista vazia ≠ ausente: ausente seria o cursinho inteiro (inclusive
    // alunos de outros períodos), e o ms recusa []
    if (usuarios.length === 0) return [];
    const resposta = (await this.relatorio.buscarSimulados(
      cursinhoId,
      usuarios,
    )) as { simulados?: SimuladoDoRecorte[] };
    return (resposta?.simulados ?? [])
      .map((s) => ({
        simuladoId: s.simuladoId,
        nome: s.nome ?? 'Simulado sem nome',
        em: s.primeiroEnvio ?? null,
        media: pct(s.mediaAproveitamento),
        participantes: s.comLeituraConcluida,
      }))
      .sort((a, b) => (a.em ?? '').localeCompare(b.em ?? ''));
  }

  /** Simulados e redação por mês, somando as turmas (média ponderada). */
  private async porMes(
    turmaIds: string[],
    inicio: string,
    fim: string,
  ): Promise<MesDeDesempenhoDtoOutput[]> {
    if (turmaIds.length === 0) return [];
    const meses = new Map<
      string,
      {
        alunos: number;
        somaSimulado: number;
        corrigidas: number;
        somaRedacao: number;
      }
    >();
    const mes = (m: string) => {
      if (!meses.has(m))
        meses.set(m, {
          alunos: 0,
          somaSimulado: 0,
          corrigidas: 0,
          somaRedacao: 0,
        });
      return meses.get(m);
    };

    const agregados = await Promise.all(
      turmaIds.map((id) => this.simuladoHttp.listUserGroupAggregates(id)),
    );
    for (const lista of agregados) {
      for (const d of lista ?? []) {
        const alunos = Number(
          d?.payload?.studentsWithAtLeastOneCompletedAttempt ?? 0,
        );
        if (!d?.month || alunos === 0) continue;
        const m = mes(d.month);
        m.alunos += alunos;
        m.somaSimulado += Number(d.payload.geral ?? 0) * alunos;
      }
    }

    const redacoes = await this.em
      .getRepository(ClassEssaySnapshot)
      .find({ where: { classId: In(turmaIds) } });
    for (const r of redacoes) {
      const corrigidas = Number(r.payload?.essaysReviewedByHuman ?? 0);
      if (corrigidas === 0) continue;
      const m = mes(r.month);
      m.corrigidas += corrigidas;
      m.somaRedacao += Number(r.payload.geral ?? 0) * corrigidas;
    }

    return [...meses.entries()]
      .filter(([m]) => m >= inicio && m <= fim)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => ({
        mes: m,
        simulados: {
          participantes: v.alunos,
          media: v.alunos ? pct(v.somaSimulado / v.alunos) : null,
        },
        redacao: {
          corrigidas: v.corrigidas,
          media: v.corrigidas ? Math.round(v.somaRedacao / v.corrigidas) : null,
        },
      }));
  }
}

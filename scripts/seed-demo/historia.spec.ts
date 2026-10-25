import { planejarHistorias } from './historia';
import { reiniciarAleatorio } from './aleatorio';
import { alunosDoAno, ANOS, datasDoAno, EVASAO } from './config';
import { diasDeChamada, somarDias } from './calendario';
import { StatusApplication } from '../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import {
  MOTIVO_DESISTENCIA_INICIAL,
  MOTIVOS_DE_CANCELAMENTO,
} from '../../src/modules/prepCourse/indicadores/motivos-de-cancelamento';

const hoje = new Date('2026-10-24T00:00:00Z');

describe('planejarHistorias', () => {
  beforeEach(reiniciarAleatorio);

  it('cancela a fração pedida, arredondada', () => {
    const h = planejarHistorias(2024, 45, 0.22, hoje);
    expect(h.filter((x) => x.saida).length).toBe(10);
  });

  it.each([
    [2024, 8],
    [2025, 8],
    [2026, 8],
  ] as const)('%i: com as turmas da config, cancela %i', (ano, saidas) => {
    const h = planejarHistorias(ano, alunosDoAno(ano), EVASAO[ano], hoje);
    expect(h).toHaveLength(alunosDoAno(ano));
    expect(h.filter((x) => x.saida)).toHaveLength(saidas);
  });

  it('ano encerrado: quem fica termina Encerrada; quem sai, Cancelada', () => {
    const h = planejarHistorias(2024, alunosDoAno(2024), EVASAO[2024], hoje);
    for (const x of h)
      expect(x.statusFinal).toBe(
        x.saida
          ? StatusApplication.EnrollmentCancelled
          : StatusApplication.EnrollmentClosed,
      );
  });

  it('ano atual: quem fica segue Matriculado e nenhuma saída é no futuro', () => {
    const h = planejarHistorias(2026, alunosDoAno(2026), EVASAO[2026], hoje);
    for (const x of h) {
      if (!x.saida) expect(x.statusFinal).toBe(StatusApplication.Enrolled);
      else expect(x.saida.data < hoje).toBe(true);
    }
  });

  it('motivos sempre da lista oficial e saídas dentro do período', () => {
    const { periodoInicio, periodoFim } = datasDoAno(2025);
    for (const x of planejarHistorias(
      2025,
      alunosDoAno(2025),
      EVASAO[2025],
      hoje,
    ).filter((x) => x.saida)) {
      expect(MOTIVOS_DE_CANCELAMENTO).toContain(x.saida!.motivo);
      expect(x.saida!.data > periodoInicio && x.saida!.data < periodoFim).toBe(
        true,
      );
    }
  });

  it('desistência inicial cai nas 6 primeiras semanas', () => {
    const { periodoInicio } = datasDoAno(2025);
    const limite = new Date(periodoInicio.getTime() + 42 * 86400000);
    for (const x of planejarHistorias(
      2025,
      alunosDoAno(2025),
      EVASAO[2025],
      hoje,
    ))
      if (x.saida?.motivo === 'Desistência inicial')
        expect(x.saida.data <= limite).toBe(true);
  });

  it('matrícula antes do início do período e depois do fim das inscrições', () => {
    const { inscricaoFim, periodoInicio } = datasDoAno(2024);
    for (const x of planejarHistorias(
      2024,
      alunosDoAno(2024),
      EVASAO[2024],
      hoje,
    )) {
      expect(x.matriculadoEm > inscricaoFim).toBe(true);
      expect(x.matriculadoEm <= periodoInicio).toBe(true);
      expect(x.inscritoEm <= inscricaoFim).toBe(true);
    }
  });

  it('quem sai ao longo do ano some antes: >=3 chamadas seguidas sem vir antes da saída', () => {
    for (const x of planejarHistorias(
      2025,
      alunosDoAno(2025),
      EVASAO[2025],
      hoje,
    ))
      if (x.saida && x.saida.motivo !== MOTIVO_DESISTENCIA_INICIAL) {
        expect(x.sumindoDesde!.getTime()).toBeGreaterThan(
          x.matriculadoEm.getTime(),
        );
        const ate = new Date(x.saida.data.getTime() - 1);
        expect(
          diasDeChamada(x.sumindoDesde!, ate, [2, 4]).length,
        ).toBeGreaterThanOrEqual(3);
        expect(
          diasDeChamada(x.sumindoDesde!, ate, [1, 3]).length,
        ).toBeGreaterThanOrEqual(3);
      }
  });

  it.each(ANOS)(
    '%i: metade das saídas é desistência inicial (mar–abr) e a evasão fica entre 15%% e 25%%',
    (ano) => {
      const { periodoInicio } = datasDoAno(ano);
      const limite = somarDias(periodoInicio, 42);
      const h = planejarHistorias(ano, alunosDoAno(ano), EVASAO[ano], hoje);
      const saidas = h.filter((x) => x.saida);
      const iniciais = saidas.filter(
        (x) => x.saida!.motivo === MOTIVO_DESISTENCIA_INICIAL,
      );
      expect(saidas.length / h.length).toBeGreaterThanOrEqual(0.15);
      expect(saidas.length / h.length).toBeLessThanOrEqual(0.25);
      expect(iniciais.length).toBe(Math.round(saidas.length * 0.5));
      for (const x of iniciais) {
        expect(x.saida!.data >= periodoInicio).toBe(true);
        expect(x.saida!.data <= limite).toBe(true);
      }
    },
  );

  it('desistência inicial some só uma semana antes, nunca antes do início do período', () => {
    for (const ano of ANOS) {
      const { periodoInicio } = datasDoAno(ano);
      for (const x of planejarHistorias(
        ano,
        alunosDoAno(ano),
        EVASAO[ano],
        hoje,
      ))
        if (x.saida?.motivo === MOTIVO_DESISTENCIA_INICIAL) {
          const esperado = Math.max(
            periodoInicio.getTime(),
            x.saida.data.getTime() - 7 * 86400000,
          );
          expect(x.sumindoDesde!.getTime()).toBe(esperado);
        }
    }
  });

  it('ano atual: exatamente 3 alunos ativos sumindo hoje, com >=3 chamadas sem vir', () => {
    const sumindo = planejarHistorias(
      2026,
      alunosDoAno(2026),
      EVASAO[2026],
      hoje,
    ).filter((x) => !x.saida && x.sumindoDesde);
    expect(sumindo).toHaveLength(3);
    for (const x of sumindo) {
      expect(x.statusFinal).toBe(StatusApplication.Enrolled);
      expect(x.sumindoDesde! < hoje).toBe(true);
      expect(x.sumindoDesde! > x.matriculadoEm).toBe(true);
      const ate = new Date(hoje.getTime() - 1);
      expect(
        diasDeChamada(x.sumindoDesde!, ate, [2, 4]).length,
      ).toBeGreaterThanOrEqual(3);
      expect(
        diasDeChamada(x.sumindoDesde!, ate, [1, 3]).length,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it.each([2024, 2025] as const)('%i: ninguém fica sumindo sem sair', (ano) => {
    const h = planejarHistorias(ano, alunosDoAno(ano), EVASAO[ano], hoje);
    expect(h.filter((x) => !x.saida && x.sumindoDesde)).toHaveLength(0);
  });

  it('mesma semente, mesmo plano', () => {
    const a = planejarHistorias(2026, alunosDoAno(2026), EVASAO[2026], hoje);
    reiniciarAleatorio();
    const b = planejarHistorias(2026, alunosDoAno(2026), EVASAO[2026], hoje);
    expect(b).toEqual(a);
  });
});

import { planejarHistorias } from './historia';
import { reiniciarAleatorio } from './aleatorio';
import { datasDoAno } from './config';
import { StatusApplication } from '../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { MOTIVOS_DE_CANCELAMENTO } from '../../src/modules/prepCourse/indicadores/motivos-de-cancelamento';

const hoje = new Date('2026-10-24T00:00:00Z');

describe('planejarHistorias', () => {
  beforeEach(reiniciarAleatorio);

  it('cancela a fração pedida, arredondada', () => {
    const h = planejarHistorias(2024, 45, 0.22, hoje);
    expect(h.filter((x) => x.saida).length).toBe(10);
  });

  it('ano encerrado: quem fica termina Encerrada; quem sai, Cancelada', () => {
    const h = planejarHistorias(2024, 45, 0.22, hoje);
    for (const x of h)
      expect(x.statusFinal).toBe(
        x.saida
          ? StatusApplication.EnrollmentCancelled
          : StatusApplication.EnrollmentClosed,
      );
  });

  it('ano atual: quem fica segue Matriculado e nenhuma saída é no futuro', () => {
    const h = planejarHistorias(2026, 45, 0.15, hoje);
    for (const x of h) {
      if (!x.saida) expect(x.statusFinal).toBe(StatusApplication.Enrolled);
      else expect(x.saida.data < hoje).toBe(true);
    }
  });

  it('motivos sempre da lista oficial e saídas dentro do período', () => {
    const { periodoInicio, periodoFim } = datasDoAno(2025);
    for (const x of planejarHistorias(2025, 45, 0.18, hoje).filter(
      (x) => x.saida,
    )) {
      expect(MOTIVOS_DE_CANCELAMENTO).toContain(x.saida!.motivo);
      expect(x.saida!.data > periodoInicio && x.saida!.data < periodoFim).toBe(
        true,
      );
    }
  });

  it('desistência inicial cai nas 6 primeiras semanas', () => {
    const { periodoInicio } = datasDoAno(2025);
    const limite = new Date(periodoInicio.getTime() + 42 * 86400000);
    for (const x of planejarHistorias(2025, 45, 0.18, hoje))
      if (x.saida?.motivo === 'Desistência inicial')
        expect(x.saida.data <= limite).toBe(true);
  });

  it('matrícula antes do início do período e depois do fim das inscrições', () => {
    const { inscricaoFim, periodoInicio } = datasDoAno(2024);
    for (const x of planejarHistorias(2024, 45, 0.22, hoje)) {
      expect(x.matriculadoEm > inscricaoFim).toBe(true);
      expect(x.matriculadoEm <= periodoInicio).toBe(true);
      expect(x.inscritoEm <= inscricaoFim).toBe(true);
    }
  });

  it('quem sai por abandono some antes (sumindoDesde ~3 semanas antes da saída)', () => {
    for (const x of planejarHistorias(2025, 45, 0.18, hoje))
      if (x.saida && x.saida.motivo !== 'Desistência inicial')
        expect(x.sumindoDesde!.getTime()).toBe(
          x.saida.data.getTime() - 21 * 86400000,
        );
  });
});

import { EventoSimuladoProva } from './evento-simulado-prova.entity';
import { SimuladosDasProvasService } from './simulados-das-provas.service';

const linha = (provaId: string, simulados: EventoSimuladoProva['simulados']) =>
  ({ id: `l-${provaId}`, provaId, simulados }) as EventoSimuladoProva;

describe('SimuladosDasProvasService (tickets/039)', () => {
  const montar = (
    doMs: Record<string, { simuladoId: string; nome: string }[]>,
  ) => {
    const eventos = { completarSimulados: jest.fn() };
    const ms = {
      buscar: jest.fn(async (id: string) =>
        doMs[id] ? { simulados: doMs[id] } : null,
      ),
    };
    const svc = new SimuladosDasProvasService(eventos as never, ms as never);
    return { svc, eventos, ms };
  };

  it('usa os simulados já guardados, sem ir ao ms', async () => {
    const { svc, ms, eventos } = montar({});
    const guardados = [{ simuladoId: 's1', nome: 'P' }];
    const r = await svc.dasProvas([linha('p1', guardados)]);
    expect(r.get('p1')).toEqual(guardados);
    expect(ms.buscar).not.toHaveBeenCalled();
    expect(eventos.completarSimulados).not.toHaveBeenCalled();
  });

  it('evento de antes (nulo): busca no ms e completa a linha', async () => {
    const doMs = [
      { simuladoId: 'si', nome: 'P Inglês' },
      { simuladoId: 'se', nome: 'P Espanhol' },
    ];
    const { svc, eventos } = montar({ p1: doMs });
    const r = await svc.dasProvas([linha('p1', null)]);
    expect(r.get('p1')).toEqual(doMs);
    expect(eventos.completarSimulados).toHaveBeenCalledWith('l-p1', doMs);
  });

  it('ms sem a prova: lista vazia e a linha fica nula para a próxima', async () => {
    const { svc, eventos } = montar({});
    const r = await svc.dasProvas([linha('p1', null)]);
    expect(r.get('p1')).toEqual([]);
    expect(eventos.completarSimulados).not.toHaveBeenCalled();
  });
});

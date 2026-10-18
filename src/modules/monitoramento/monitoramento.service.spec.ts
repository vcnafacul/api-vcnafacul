import { NotFoundException } from '@nestjs/common';
import { MonitoramentoService } from './monitoramento.service';
import { TTL_MONITORAMENTO } from './chave-do-monitoramento';

describe('MonitoramentoService (044/01)', () => {
  const montar = (existe = true) => {
    const cursinhos = { existe: jest.fn().mockResolvedValue(existe) };
    const inscricoes = {
      getTotalNonTest: jest.fn().mockResolvedValue(3),
      getTotalEntity: jest.fn().mockResolvedValue(5),
    };
    const estudantes = {
      getTotalNonTest: jest.fn().mockResolvedValue(120),
      getTotalEnrolledNonTest: jest.fn().mockResolvedValue(40),
      countStudentsEffectivelyServed: jest.fn().mockResolvedValue(60),
      countStudentsCurrentlyEnrolled: jest.fn().mockResolvedValue(35),
    };
    const cache = {
      wrap: jest.fn((...args: [string, () => unknown, number?]) => args[1]()),
    };
    const service = new MonitoramentoService(
      cursinhos as never,
      inscricoes as never,
      estudantes as never,
      cache as never,
    );
    return { service, cursinhos, inscricoes, estudantes, cache };
  };

  it('resumo: tudo filtrado pelo cursinho, em cache de 1 h', async () => {
    const { service, inscricoes, estudantes, cache } = montar();
    await expect(service.resumo('A')).resolves.toEqual({
      processosNaoTeste: 3,
      processosTotal: 5,
      inscricoesNaoTeste: 120,
      matriculasNaoTeste: 40,
    });
    expect(inscricoes.getTotalNonTest).toHaveBeenCalledWith('A');
    expect(inscricoes.getTotalEntity).toHaveBeenCalledWith('A');
    expect(estudantes.getTotalNonTest).toHaveBeenCalledWith('A');
    expect(estudantes.getTotalEnrolledNonTest).toHaveBeenCalledWith('A');
    expect(cache.wrap.mock.calls[0][0]).toBe('monitoramento:resumo:A');
    expect(cache.wrap.mock.calls[0][2]).toBe(TTL_MONITORAMENTO);
  });

  it('estudantes: as contagens da página do cursinho', async () => {
    const { service, estudantes, cache } = montar();
    await expect(service.estudantesDoCursinho('A')).resolves.toEqual({
      estudantesAtendidos: 60,
      estudantesAtivos: 35,
    });
    expect(estudantes.countStudentsEffectivelyServed).toHaveBeenCalledWith('A');
    expect(estudantes.countStudentsCurrentlyEnrolled).toHaveBeenCalledWith('A');
    expect(cache.wrap.mock.calls[0][0]).toBe('monitoramento:estudantes:A');
  });

  it('cursinho inexistente → 404, sem conta e sem cache', async () => {
    const { service, cache, inscricoes } = montar(false);
    await expect(service.resumo('X')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.estudantesDoCursinho('X')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cache.wrap).not.toHaveBeenCalled();
    expect(inscricoes.getTotalNonTest).not.toHaveBeenCalled();
  });
});
